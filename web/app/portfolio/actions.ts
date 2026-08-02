"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import iconv from "iconv-lite";
import { prisma } from "@/lib/db";
import { STOCK_TICKER_BY_NAME } from "@/lib/stock-lookup";
import { toKrw } from "@/lib/fx";

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

// 증권사 잔고 CSV(계좌번호/종목명/잔고수량/매수금액/.../잔고구분/...)를 파싱해
// 기존 보유 종목을 전부 삭제하고 새 데이터로 교체한다. 국내 CSV는 CP949 인코딩이 일반적이라 BOM 유무로 판별한다.
export async function importHoldings(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("파일을 선택해주세요.");
  }

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
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (rows.length < 2) {
    throw new Error("가져올 데이터가 없습니다.");
  }

  const header = rows[0].map((h) => String(h).trim());
  const nameIdx = header.indexOf("종목명");
  const qtyIdx = header.indexOf("잔고수량");
  const costIdx = header.indexOf("매수금액");
  const valueIdx = header.indexOf("평가금액");
  const gubunIdx = header.indexOf("잔고구분");

  if (nameIdx === -1 || qtyIdx === -1 || costIdx === -1 || valueIdx === -1 || gubunIdx === -1) {
    throw new Error("CSV 형식을 확인해주세요. (종목명/잔고수량/매수금액/평가금액/잔고구분 컬럼이 필요합니다.)");
  }

  const parsedRows: { ticker: string; name: string; region: string; currency: string; quantity: number; avgPrice: number; currentValue: number }[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((row, i) => {
    const name = String(row[nameIdx] ?? "").trim();
    if (!name) return;

    const rowNum = i + 2;
    const quantity = Number(String(row[qtyIdx] ?? "").replace(/,/g, ""));
    const totalCost = Number(String(row[costIdx] ?? "").replace(/,/g, ""));
    const totalValue = Number(String(row[valueIdx] ?? "").replace(/,/g, ""));
    const gubun = String(row[gubunIdx] ?? "").trim();

    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`${rowNum}행 (${name}): 잔고수량이 올바르지 않습니다.`);
      return;
    }
    if (!Number.isFinite(totalCost) || totalCost <= 0) {
      errors.push(`${rowNum}행 (${name}): 매수금액이 올바르지 않습니다.`);
      return;
    }
    if (!Number.isFinite(totalValue) || totalValue < 0) {
      errors.push(`${rowNum}행 (${name}): 평가금액이 올바르지 않습니다.`);
      return;
    }

    let region: string;
    if (gubun.includes("해외")) {
      region = "US";
    } else if (gubun.includes("보통") || gubun.includes("국내")) {
      region = "KR";
    } else {
      errors.push(`${rowNum}행 (${name}): 알 수 없는 잔고구분 "${gubun}"입니다.`);
      return;
    }

    const ticker = STOCK_TICKER_BY_NAME[name];
    if (!ticker) {
      errors.push(`${rowNum}행 (${name}): 티커 매핑이 없습니다. web/lib/stock-lookup.ts에 추가해주세요.`);
      return;
    }

    // 매수금액/평가금액은 국내/해외 구분 없이 이미 원화로 환산된 금액이라 currency는 항상 KRW로 저장한다.
    parsedRows.push({ ticker, name, region, currency: "KRW", quantity, avgPrice: totalCost / quantity, currentValue: totalValue });
  });

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  if (parsedRows.length === 0) {
    throw new Error("가져올 데이터가 없습니다.");
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.holding.deleteMany({}),
    ...parsedRows.map((r) =>
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
    ),
  ]);

  revalidatePath("/portfolio");
}

export async function ensureTodaySnapshot() {
  const holdings = await prisma.holding.findMany();

  const totalValue = holdings.reduce((sum, h) => sum + toKrw(h.currentValue, h.currency), 0);
  const totalCost = holdings.reduce((sum, h) => sum + toKrw(h.quantity * h.avgPrice, h.currency), 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.portfolioSnapshot.upsert({
    where: { date: today },
    update: { totalValue, totalCost },
    create: { date: today, totalValue, totalCost },
  });
}
