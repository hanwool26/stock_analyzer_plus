import { fetchUsdKrwRate } from "./quotes";

// 실시간 환율 조회 실패 시 사용하는 폴백값.
export const FALLBACK_USD_KRW_RATE = 1380;

export function toKrw(value: number, currency: string, usdKrwRate: number = FALLBACK_USD_KRW_RATE): number {
  return currency === "USD" ? value * usdKrwRate : value;
}

/** 실시간 USD/KRW 환율. 조회 실패 시 FALLBACK_USD_KRW_RATE를 반환한다. */
export async function getLiveUsdKrwRate(): Promise<number> {
  const rate = await fetchUsdKrwRate();
  return rate ?? FALLBACK_USD_KRW_RATE;
}
