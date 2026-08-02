// 1회성 데이터 갱신 스크립트.
// reference_data/korean_stocks.csv, reference_data/global_stocks.csv (메리츠증권 MTS 내보내기)를 읽어
// region 단위로 기존 Holding/Transaction을 교체한다. web/app/portfolio/actions.ts의 importHoldings()와
// 동일한 파싱 규칙을 순수 Node 스크립트로 재구현했다 (서버 액션은 revalidatePath 등 Next 런타임에 의존해
// 스크립트에서 바로 재사용할 수 없다).
//
// 실행:
//   node --env-file=.env scripts/import-reference-csvs.mjs           (dry-run, DB 변경 없음)
//   node --env-file=.env scripts/import-reference-csvs.mjs --apply   (실제 적용)

import { Client } from "pg";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import iconv from "iconv-lite";

const apply = process.argv.includes("--apply");

const STOCK_TICKER_BY_NAME = {
  SK하이닉스: "000660",
  삼양식품: "003230",
  현대차: "005380",
  삼성전자: "005930",
  삼성전기: "009150",
  현대모비스: "012330",
  한화에어로스페이스: "012450",
  삼성증권: "016360",
  SK텔레콤: "017670",
  삼성생명: "032830",
  LIG디펜스앤에어로스페이스: "079550",
  KB금융: "105560",
};

function readCsvRows(path) {
  const buffer = readFileSync(path);
  const hasUtf8Bom = buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
  let text;
  if (hasUtf8Bom) {
    text = buffer.subarray(3).toString("utf8");
  } else {
    const asUtf8 = buffer.toString("utf8");
    const isValidUtf8 = Buffer.from(asUtf8, "utf8").equals(buffer);
    text = isValidUtf8 ? asUtf8 : iconv.decode(buffer, "cp949");
  }
  const workbook = XLSX.read(text, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
}

function parseNumber(value) {
  return Number(String(value ?? "").replace(/,/g, ""));
}

function parseKoreanStocksRows(rows) {
  const header = rows[0].map((h) => String(h).trim());
  const nameIdx = header.indexOf("종목명");
  const qtyIdx = header.indexOf("보유수량");
  const avgPriceIdx = header.indexOf("매입가");
  const valueIdx = header.indexOf("평가금액");
  if ([nameIdx, qtyIdx, avgPriceIdx, valueIdx].includes(-1)) {
    throw new Error("korean_stocks.csv 형식을 확인해주세요.");
  }

  const parsed = [];
  rows.slice(1).forEach((row) => {
    const name = String(row[nameIdx] ?? "").trim();
    if (!name) return;
    const quantity = parseNumber(row[qtyIdx]);
    const avgPrice = parseNumber(row[avgPriceIdx]);
    const currentValue = parseNumber(row[valueIdx]);
    const ticker = STOCK_TICKER_BY_NAME[name];
    if (!ticker) throw new Error(`티커 매핑 없음: ${name}`);
    parsed.push({ ticker, name, region: "KR", currency: "KRW", quantity, avgPrice, currentValue });
  });
  return parsed;
}

function parseGlobalStocksRows(rows) {
  if (String(rows[0]?.[2]).trim() !== "종목코드" || String(rows[1]?.[2]).trim() !== "종목명") {
    throw new Error("global_stocks.csv 형식을 확인해주세요.");
  }
  const parsed = [];
  const dataRows = rows.slice(2);
  for (let i = 0; i < dataRows.length; i += 2) {
    const codeRow = dataRows[i];
    const ticker = String(codeRow?.[2] ?? "").trim();
    if (!ticker) continue;
    const nameRow = dataRows[i + 1];
    const name = String(nameRow[2] ?? "").trim();
    const quantity = parseNumber(codeRow[3]);
    const avgPrice = parseNumber(nameRow[4]);
    const currentValue = parseNumber(codeRow[6]);
    parsed.push({ ticker, name, region: "US", currency: "USD", quantity, avgPrice, currentValue });
  }
  return parsed;
}

const krRows = parseKoreanStocksRows(readCsvRows("../reference_data/korean_stocks.csv"));
const usRows = parseGlobalStocksRows(readCsvRows("../reference_data/global_stocks.csv"));

console.log(`국내주식 ${krRows.length}건, 해외주식 ${usRows.length}건 파싱 완료 (${apply ? "적용 모드" : "dry-run"}):\n`);
[...krRows, ...usRows].forEach((r) => {
  console.log(`- [${r.region}] ${r.name} (${r.ticker}): 수량 ${r.quantity}, 평단가 ${r.avgPrice}, 평가금액 ${r.currentValue} ${r.currency}`);
});

if (!apply) {
  console.log("\ndry-run입니다. 실제로 적용하려면 --apply 플래그를 붙여 다시 실행하세요.");
  process.exit(0);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");

  await client.query(`DELETE FROM "Holding" WHERE region = 'KR'`);
  await client.query(`DELETE FROM "Holding" WHERE region = 'US'`);

  const now = new Date();
  for (const r of [...krRows, ...usRows]) {
    const holdingId = randomUUID();
    await client.query(
      `INSERT INTO "Holding" (id, ticker, name, region, quantity, "avgPrice", "currentValue", currency, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
      [holdingId, r.ticker, r.name, r.region, r.quantity, r.avgPrice, r.currentValue, r.currency, now]
    );
    await client.query(
      `INSERT INTO "Transaction" (id, "holdingId", type, quantity, price, "executedAt", "createdAt")
       VALUES ($1, $2, 'BUY', $3, $4, $5, $5)`,
      [randomUUID(), holdingId, r.quantity, r.avgPrice, now]
    );
  }

  await client.query("COMMIT");
  console.log("\n적용 완료.");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  await client.end();
}
