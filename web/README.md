This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Portfolio Excel/CSV import format

The "엑셀 가져오기" button on `/portfolio` (see [`ImportHoldingsDialog`](components/ImportHoldingsDialog.tsx)) imports holdings from Meritz Securities' MTS app exports. You can upload the Korean file, the US file, or both — only the region(s) you upload get their existing holdings replaced. The parsing logic lives in [`app/portfolio/actions.ts`](app/portfolio/actions.ts) (`importHoldings`).

**Encoding/file type**: `.csv` (CP949 or UTF-8, with or without BOM — auto-detected) or `.xlsx`.

### Korean stocks — `korean_stocks.csv`

One header row, one row per stock. Required columns (matched by header name, order doesn't matter):

| Column | Meaning |
|---|---|
| `종목명` | Stock name — must match an entry in [`STOCK_TICKER_BY_NAME`](lib/stock-lookup.ts) (name → ticker map) |
| `잔고수량` | Quantity held |
| `매입가` | Average cost per share |
| `평가금액` | Current market value |

```csv
종목코드,종목명,잔고구분,잔고수량,매입가,현재가,전일비,,등락률,평가금액,평가손익,손익률(%),매수일,대출금액,대출일,대출만기,대출유형
A032830,삼성생명,일반,35,"263,848","275,500",▼,"-12,000",-4.17,"9,642,500","407,829",4.42%,,0,,,,
```

Extra columns (종목코드, 잔고구분, 현재가, etc.) are ignored. If a `종목명` has no entry in `STOCK_TICKER_BY_NAME`, the row is rejected — add the mapping there and retry.

### US stocks — `global_stocks.csv`

The header spans **2 rows**, and each holding is **2 data rows** (a "code row" + a "name row") — this is how Meritz's export merges the code-row and name-row headers into one sheet. Detected by checking that column C (index 2) of row 1 is `종목코드` and of row 2 is `종목명`.

| Row | Col A | Col B | Col C | Col D | Col E | Col F | Col G |
|---|---|---|---|---|---|---|---|
| Header 1 (code) | 상품구분 | 국가 | 종목코드 | 보유수량 | 현재가 | 평가손익 | 평가금액(외화) |
| Header 2 (name) | *(blank)* | *(blank)* | 종목명 | 매도가능 | 평균가 | 수익률(%) | 매입금액(외화) |
| Data — code row | 일반 | 미국 | `AAPL` | `5` | `313.0706` | `-126.14` | `1,565.35` |
| Data — name row | | | `애플` | `5` | `338.3000` | `-7.46` | `1,691.50` |

Fields actually used per holding:

- **종목코드** (code row, col C) → ticker, used as-is (no name→ticker lookup needed)
- **보유수량** (code row, col D) → quantity. This is the *total* held quantity and is what gets imported.
- **매도가능** (name row, col D) → *not* validated against 보유수량. It can be lower than 보유수량 when shares are on loan (대출구분 column), which is normal — the two are allowed to differ.
- **평균가** (name row, col E) → average cost per share
- **평가금액(외화)** (code row, col G) → current market value

A row pair is skipped once 종목코드 (col C of the code row) is empty — e.g. a trailing totals row.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
