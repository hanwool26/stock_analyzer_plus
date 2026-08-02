import type { Holding } from "@/app/generated/prisma/client";
import { getLiveUsdKrwRate, toKrw } from "./fx";
import { fetchKrQuote, fetchUsQuote } from "./quotes";

export type HoldingValuation = Holding & {
  valueKrw: number;
  costKrw: number;
  returnPct: number;
  isLive: boolean;
  livePrice: number | null;
};

export interface PortfolioValuation {
  valuations: HoldingValuation[];
  usdKrwRate: number;
}

/** 보유 종목의 실시간 시세/환율을 조회해 KRW 환산 평가금액·수익률을 계산한다.
 *  시세 조회에 실패한 종목은 마지막 저장된 currentValue로 폴백한다 (isLive: false). */
export async function getLiveHoldingValuations(holdings: Holding[]): Promise<PortfolioValuation> {
  const [usdKrwRate, quotes] = await Promise.all([
    getLiveUsdKrwRate(),
    Promise.allSettled(holdings.map((h) => (h.region === "KR" ? fetchKrQuote(h.ticker) : fetchUsQuote(h.ticker)))),
  ]);

  const valuations = holdings.map((h, i) => {
    const result = quotes[i];
    const livePrice = result.status === "fulfilled" ? result.value : null;
    const valueNative = livePrice != null ? livePrice * h.quantity : h.currentValue;
    const valueKrw = toKrw(valueNative, h.currency, usdKrwRate);
    const costKrw = toKrw(h.quantity * h.avgPrice, h.currency, usdKrwRate);
    const returnPct = costKrw > 0 ? ((valueKrw - costKrw) / costKrw) * 100 : 0;
    return { ...h, valueKrw, costKrw, returnPct, isLive: livePrice != null, livePrice };
  });

  return { valuations, usdKrwRate };
}
