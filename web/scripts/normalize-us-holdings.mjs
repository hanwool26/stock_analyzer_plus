// 1회성 데이터 정규화 스크립트.
// CSV 가져오기가 해외(US) 종목의 매수금액/평가금액을 "환율 1440원 가정"으로 원화 환산해 저장해온 것을
// 역산해 USD 네이티브 값으로 되돌린다 (currency: KRW -> USD). 관련 Transaction.price도 함께 스케일한다.
//
// 실행:
//   node --env-file=.env scripts/normalize-us-holdings.mjs           (dry-run, DB 변경 없음)
//   node --env-file=.env scripts/normalize-us-holdings.mjs --apply   (실제 적용)
//
// region='US' AND currency='KRW'인 행만 대상으로 하므로 재실행해도 안전(멱등)하다.

import { Client } from "pg";

const ASSUMED_USD_KRW_RATE = 1440;
const apply = process.argv.includes("--apply");

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const { rows: holdings } = await client.query(
    `SELECT id, ticker, name, quantity, "avgPrice", "currentValue" FROM "Holding" WHERE region = 'US' AND currency = 'KRW'`
  );

  if (holdings.length === 0) {
    console.log("대상 없음: region='US' AND currency='KRW'인 보유 종목이 없습니다.");
  } else {
    console.log(`대상 ${holdings.length}건 (${apply ? "적용 모드" : "dry-run"}):\n`);

    for (const h of holdings) {
      const newAvgPrice = h.avgPrice / ASSUMED_USD_KRW_RATE;
      const newCurrentValue = h.currentValue / ASSUMED_USD_KRW_RATE;
      console.log(
        `- ${h.name} (${h.ticker}): avgPrice ${h.avgPrice.toLocaleString()}원 -> $${newAvgPrice.toFixed(2)}, ` +
          `currentValue ${h.currentValue.toLocaleString()}원 -> $${newCurrentValue.toFixed(2)}`
      );

      if (apply) {
        await client.query(
          `UPDATE "Holding" SET "avgPrice" = $1, "currentValue" = $2, currency = 'USD' WHERE id = $3`,
          [newAvgPrice, newCurrentValue, h.id]
        );

        const { rows: txs } = await client.query(`SELECT id, price FROM "Transaction" WHERE "holdingId" = $1`, [h.id]);
        for (const tx of txs) {
          await client.query(`UPDATE "Transaction" SET price = $1 WHERE id = $2`, [tx.price / ASSUMED_USD_KRW_RATE, tx.id]);
        }
        console.log(`  -> 거래내역 ${txs.length}건도 함께 스케일 적용 완료`);
      }
    }

    if (!apply) {
      console.log("\ndry-run입니다. 실제로 적용하려면 --apply 플래그를 붙여 다시 실행하세요.");
    } else {
      console.log("\n적용 완료.");
    }
  }
} finally {
  await client.end();
}
