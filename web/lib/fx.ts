// 실시간 환율 연동 전 임시 고정값
export const USD_KRW_RATE = 1380;

export function toKrw(value: number, currency: string, usdKrwRate: number = USD_KRW_RATE): number {
  return currency === "USD" ? value * usdKrwRate : value;
}
