"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import iconv from "iconv-lite";
import { prisma } from "@/lib/db";
import { STOCK_TICKER_BY_NAME } from "@/lib/stock-lookup";

type ParsedHolding = {
  ticker: string;
  name: string;
  region: "KR" | "US";
  currency: "KRW" | "USD";
  quantity: number;
  avgPrice: number;
  currentValue: number;
};

export async function addHolding(formData: FormData) {
  const ticker = String(formData.get("ticker") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const region = String(formData.get("region") ?? "KR");
  const currency = String(formData.get("currency") ?? "KRW");
  const quantity = Number(formData.get("quantity"));
  const price = Number(formData.get("price"));

  if (!ticker || !name || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
    throw new Error("입력값을 확인해주세요.");
  }

  await prisma.holding.create({
    data: {
      ticker,
      name,
      region,
      currency,
      quantity,
      avgPrice: price,
      currentValue: quantity * price,
      transactions: {
        create: {
          type: "BUY",
          quantity,
          price,
          executedAt: new Date(),
        },
      },
    },
  });

  revalidatePath("/portfolio");
}

export async function addTransaction(formData: FormData) {
  const holdingId = String(formData.get("holdingId") ?? "");
  const type = String(formData.get("type") ?? "BUY") as "BUY" | "SELL";
  const quantity = Number(formData.get("quantity"));
  const price = Number(formData.get("price"));

  if (!holdingId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
    throw new Error("입력값을 확인해주세요.");
  }

  const holding = await prisma.holding.findUniqueOrThrow({ where: { id: holdingId } });

  let newQuantity: number;
  let newAvgPrice: number;
  let newCurrentValue: number;

  if (type === "BUY") {
    newQuantity = holding.quantity + quantity;
    newAvgPrice = (holding.quantity * holding.avgPrice + quantity * price) / newQuantity;
    newCurrentValue = holding.currentValue + quantity * price; // 매수분은 매수가를 현재가로 근사
  } else {
    newQuantity = Math.max(0, holding.quantity - quantity);
    newAvgPrice = holding.avgPrice; // 매도 시 평단가는 유지
    newCurrentValue = holding.quantity > 0 ? holding.currentValue * (newQuantity / holding.quantity) : 0;
  }

  await prisma.$transaction([
    prisma.transaction.create({
      data: { holdingId, type, quantity, price, executedAt: new Date() },
    }),
    prisma.holding.update({
      where: { id: holdingId },
      data: { quantity: newQuantity, avgPrice: newAvgPrice, currentValue: newCurrentValue },
    }),
  ]);

  revalidatePath("/portfolio");
}

export async function deleteHolding(holdingId: string) {
  if (!holdingId) return;
  await prisma.holding.delete({ where: { id: holdingId } });
  revalidatePath("/portfolio");
}

// 메리츠증권 MTS에서 내보낸 엑셀/CSV를 파싱한다. CP949 인코딩이 일반적이라 BOM 유무로 판별한다.
async function parseSheetRows(file: File): Promise<unknown[][]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const isCsv = file.name.toLowerCase().endsWith(".csv");

  let workbook: XLSX.WorkBook;
  if (isCsv) {
    const hasUtf8Bom = buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
    let text: string;
    if (hasUtf8Bom) {
      text = buffer.subarray(3).toString("utf8");
    } else {
      const asUtf8 = buffer.toString("utf8");
      const isValidUtf8 = Buffer.from(asUtf8, "utf8").equals(buffer);
      text = isValidUtf8 ? asUtf8 : iconv.decode(buffer, "cp949");
    }
    workbook = XLSX.read(text, { type: "string" });
  } else {
    workbook = XLSX.read(buffer, { type: "buffer" });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
}

function parseNumber(value: unknown): number {
  return Number(String(value ?? "").replace(/,/g, ""));
}

// 국내주식 잔고 CSV: 종목명/보유수량/매입가(주당 평균단가)/평가금액이 종목당 1행.
function parseKoreanStocksRows(rows: unknown[][]): { parsed: ParsedHolding[]; errors: string[] } {
  if (rows.length < 2) {
    return { parsed: [], errors: ["국내주식 CSV: 가져올 데이터가 없습니다."] };
  }

  const header = rows[0].map((h) => String(h).trim());
  const nameIdx = header.indexOf("종목명");
  const qtyIdx = header.indexOf("보유수량");
  const avgPriceIdx = header.indexOf("매입가");
  const valueIdx = header.indexOf("평가금액");

  if ([nameIdx, qtyIdx, avgPriceIdx, valueIdx].includes(-1)) {
    return { parsed: [], errors: ["국내주식 CSV 형식을 확인해주세요. (종목명/보유수량/매입가/평가금액 컬럼이 필요합니다.)"] };
  }

  const parsed: ParsedHolding[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((row, i) => {
    const name = String(row[nameIdx] ?? "").trim();
    if (!name) return;

    const rowNum = i + 2;
    const quantity = parseNumber(row[qtyIdx]);
    const avgPrice = parseNumber(row[avgPriceIdx]);
    const currentValue = parseNumber(row[valueIdx]);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`국내주식 CSV ${rowNum}행 (${name}): 보유수량이 올바르지 않습니다.`);
      return;
    }
    if (!Number.isFinite(avgPrice) || avgPrice <= 0) {
      errors.push(`국내주식 CSV ${rowNum}행 (${name}): 매입가가 올바르지 않습니다.`);
      return;
    }
    if (!Number.isFinite(currentValue) || currentValue < 0) {
      errors.push(`국내주식 CSV ${rowNum}행 (${name}): 평가금액이 올바르지 않습니다.`);
      return;
    }

    const ticker = STOCK_TICKER_BY_NAME[name];
    if (!ticker) {
      errors.push(`국내주식 CSV ${rowNum}행 (${name}): 티커 매핑이 없습니다. web/lib/stock-lookup.ts에 추가해주세요.`);
      return;
    }

    parsed.push({ ticker, name, region: "KR", currency: "KRW", quantity, avgPrice, currentValue });
  });

  return { parsed, errors };
}

// 해외주식 잔고 CSV: 헤더가 2행으로 병합되어 있고, 종목당 2행 1세트다.
// 1행(코드행): 상품구분/국가/종목코드/보유수량/현재가/평가손익/평가금액(외화)
// 2행(이름행): (공란)/(공란)/종목명/매도가능/평균가(주당 평균단가)/수익률(%)/매입금액(외화)
function parseGlobalStocksRows(rows: unknown[][]): { parsed: ParsedHolding[]; errors: string[] } {
  if (rows.length < 4 || String(rows[0]?.[2]).trim() !== "종목코드" || String(rows[1]?.[2]).trim() !== "종목명") {
    return {
      parsed: [],
      errors: ["해외주식 CSV 형식을 확인해주세요. (종목코드/종목명이 2행 헤더로 병합된 global_stocks.csv 형식이어야 합니다.)"],
    };
  }

  const parsed: ParsedHolding[] = [];
  const errors: string[] = [];
  const dataRows = rows.slice(2);

  for (let i = 0; i < dataRows.length; i += 2) {
    const codeRow = dataRows[i];
    const ticker = String(codeRow?.[2] ?? "").trim();
    if (!ticker) continue;

    const rowNum = i + 3;
    const nameRow = dataRows[i + 1];
    if (!nameRow) {
      errors.push(`해외주식 CSV ${rowNum}행 (${ticker}): 종목명 행이 누락되었습니다.`);
      continue;
    }

    const name = String(nameRow[2] ?? "").trim();
    const quantity = parseNumber(codeRow[3]);
    const nameRowQuantity = parseNumber(nameRow[3]);
    const avgPrice = parseNumber(nameRow[4]);
    const currentValue = parseNumber(codeRow[6]);

    if (!name) {
      errors.push(`해외주식 CSV ${rowNum}행 (${ticker}): 종목명이 비어 있습니다.`);
      continue;
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity !== nameRowQuantity) {
      errors.push(`해외주식 CSV ${rowNum}행 (${name}): 보유수량이 올바르지 않습니다.`);
      continue;
    }
    if (!Number.isFinite(avgPrice) || avgPrice <= 0) {
      errors.push(`해외주식 CSV ${rowNum}행 (${name}): 평균가가 올바르지 않습니다.`);
      continue;
    }
    if (!Number.isFinite(currentValue) || currentValue < 0) {
      errors.push(`해외주식 CSV ${rowNum}행 (${name}): 평가금액이 올바르지 않습니다.`);
      continue;
    }

    parsed.push({ ticker, name, region: "US", currency: "USD", quantity, avgPrice, currentValue });
  }

  return { parsed, errors };
}

// 국내/해외 잔고 CSV를 각각 파싱해 해당 지역(region)의 기존 보유 종목만 교체한다.
// 두 CSV 모두 평균단가(현지통화)를 직접 제공하므로 환율 가정 없이 정확한 값을 저장할 수 있다.
export async function importHoldings(formData: FormData) {
  const krFile = formData.get("krFile");
  const usFile = formData.get("usFile");
  const hasKrFile = krFile instanceof File && krFile.size > 0;
  const hasUsFile = usFile instanceof File && usFile.size > 0;

  if (!hasKrFile && !hasUsFile) {
    throw new Error("국내주식 또는 해외주식 CSV 파일을 하나 이상 선택해주세요.");
  }

  const errors: string[] = [];
  let krRows: ParsedHolding[] = [];
  let usRows: ParsedHolding[] = [];

  if (hasKrFile) {
    const { parsed, errors: krErrors } = parseKoreanStocksRows(await parseSheetRows(krFile as File));
    krRows = parsed;
    errors.push(...krErrors);
  }
  if (hasUsFile) {
    const { parsed, errors: usErrors } = parseGlobalStocksRows(await parseSheetRows(usFile as File));
    usRows = parsed;
    errors.push(...usErrors);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  if (krRows.length === 0 && usRows.length === 0) {
    throw new Error("가져올 데이터가 없습니다.");
  }

  const now = new Date();
  function createHoldingOps(rows: ParsedHolding[]) {
    return rows.map((r) =>
      prisma.holding.create({
        data: {
          ticker: r.ticker,
          name: r.name,
          region: r.region,
          currency: r.currency,
          quantity: r.quantity,
          avgPrice: r.avgPrice,
          currentValue: r.currentValue,
          transactions: {
            create: {
              type: "BUY",
              quantity: r.quantity,
              price: r.avgPrice,
              executedAt: now,
            },
          },
        },
      })
    );
  }

  await prisma.$transaction([
    ...(hasKrFile ? [prisma.holding.deleteMany({ where: { region: "KR" } })] : []),
    ...(hasUsFile ? [prisma.holding.deleteMany({ where: { region: "US" } })] : []),
    ...createHoldingOps(krRows),
    ...createHoldingOps(usRows),
  ]);

  revalidatePath("/portfolio");
}

// totalValue/totalCost는 호출부(포트폴리오 페이지)에서 이미 계산한 실시간 평가값을 그대로 받는다.
// 이 함수 내부에서 다시 시세를 조회하면 같은 요청 안에서 실시간 API를 중복 호출하게 된다.
export async function ensureTodaySnapshot(totalValue: number, totalCost: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.portfolioSnapshot.upsert({
    where: { date: today },
    update: { totalValue, totalCost },
    create: { date: today, totalValue, totalCost },
  });
}
