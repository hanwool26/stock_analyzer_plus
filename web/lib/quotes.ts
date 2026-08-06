// 무료 비공식 API로 실시간 시세/환율을 조회한다. 두 API 모두 공식 문서/SLA가 없어
// 응답 형식이 바뀌거나 요청이 막힐 수 있으므로, 실패 시 항상 null을 반환해 호출부가
// 마지막 저장값으로 폴백할 수 있게 한다.

const USER_AGENT = "Mozilla/5.0";
const TIMEOUT_MS = 5000;

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** 국내 종목 현재가 조회 (네이버 금융 실시간 폴링 API). */
export async function fetchKrQuote(ticker: string): Promise<number | null> {
  const json = await fetchJson(`https://polling.finance.naver.com/api/realtime/domestic/stock/${ticker}`);
  const closePrice = (json as { datas?: { closePrice?: string }[] } | null)?.datas?.[0]?.closePrice;
  if (!closePrice) return null;
  const price = Number(closePrice.replace(/,/g, ""));
  return Number.isFinite(price) ? price : null;
}

/** 해외 종목 현재가 조회 (Yahoo Finance 차트 API). */
export async function fetchUsQuote(ticker: string): Promise<number | null> {
  const json = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`);
  const price = (
    json as { chart?: { result?: { meta?: { regularMarketPrice?: number } }[] } } | null
  )?.chart?.result?.[0]?.meta?.regularMarketPrice;
  return typeof price === "number" && Number.isFinite(price) ? price : null;
}

/** USD/KRW 실시간 환율 조회 (Yahoo Finance 차트 API, 종목 시세와 동일한 엔드포인트 사용). */
export async function fetchUsdKrwRate(): Promise<number | null> {
  return fetchUsQuote("KRW=X");
}

export interface QuoteDetail {
  price: number;
  /** 전일 종가 대비 등락률(%). 상승 시 양수, 하락 시 음수. */
  changePct: number;
}

/** 국내 종목 현재가 + 전일 대비 등락률 조회 (네이버 금융 실시간 폴링 API). */
export async function fetchKrQuoteDetailed(ticker: string): Promise<QuoteDetail | null> {
  const json = await fetchJson(`https://polling.finance.naver.com/api/realtime/domestic/stock/${ticker}`);
  const data = (
    json as { datas?: { closePrice?: string; fluctuationsRatio?: string }[] } | null
  )?.datas?.[0];
  if (!data?.closePrice || !data.fluctuationsRatio) return null;

  const price = Number(data.closePrice.replace(/,/g, ""));
  // fluctuationsRatio는 이미 부호가 포함된 값이다(예: "-6.30" 하락, "2.15" 상승).
  const changePct = Number(data.fluctuationsRatio);
  if (!Number.isFinite(price) || !Number.isFinite(changePct)) return null;

  return { price, changePct };
}

/** 해외 종목 현재가 + 전일 대비 등락률 조회 (Yahoo Finance 차트 API). */
export async function fetchUsQuoteDetailed(ticker: string): Promise<QuoteDetail | null> {
  const json = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`);
  const meta = (
    json as {
      chart?: { result?: { meta?: { regularMarketPrice?: number; previousClose?: number; chartPreviousClose?: number } }[] };
    } | null
  )?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const previousClose = meta?.previousClose ?? meta?.chartPreviousClose;
  if (typeof price !== "number" || typeof previousClose !== "number" || previousClose === 0) return null;
  if (!Number.isFinite(price) || !Number.isFinite(previousClose)) return null;

  return { price, changePct: ((price - previousClose) / previousClose) * 100 };
}
