import type { Region, TechnicalSignal } from "@/lib/types";
import { formatPrice, formatSignedPct } from "@/lib/format";

const SIGNAL_STYLE: Record<TechnicalSignal["signal"], string> = {
  buy: "bg-red-50 text-red-600 border-red-200",
  sell: "bg-blue-50 text-blue-600 border-blue-200",
  neutral: "bg-slate-100 text-slate-500 border-slate-200",
};

const SIGNAL_LABEL: Record<TechnicalSignal["signal"], string> = {
  buy: "매수 관심",
  sell: "매도 주의",
  neutral: "중립",
};

const TREND_LABEL: Record<TechnicalSignal["emaTrend"], string> = {
  up: "상승 추세",
  down: "하락 추세",
  neutral: "횡보",
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span
        className={
          "text-sm font-semibold tabular-nums " +
          (tone === "up" ? "text-red-600" : tone === "down" ? "text-blue-600" : "text-slate-800")
        }
      >
        {value}
      </span>
    </div>
  );
}

export default function TechnicalBadges({
  technical,
  region,
}: {
  technical: TechnicalSignal;
  region: Region;
}) {
  const changeTone = technical.changePct > 0 ? "up" : technical.changePct < 0 ? "down" : undefined;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-slate-900">
            {formatPrice(technical.price, region)}
          </span>
          <span
            className={
              "text-xs font-semibold " +
              (changeTone === "up" ? "text-red-600" : changeTone === "down" ? "text-blue-600" : "text-slate-500")
            }
          >
            {formatSignedPct(technical.changePct)}
          </span>
        </div>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${SIGNAL_STYLE[technical.signal]}`}
        >
          {SIGNAL_LABEL[technical.signal]}
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <Stat label="RSI" value={technical.rsi.toFixed(1)} />
        <Stat label="MACD" value={technical.macd.toFixed(2)} />
        <Stat
          label="볼린저밴드"
          value={`${(technical.bbPosition * 100).toFixed(0)}%`}
        />
        <Stat label="거래량" value={`x${technical.volumeRatio.toFixed(2)}`} />
        <Stat
          label="이평선 추세"
          value={TREND_LABEL[technical.emaTrend]}
          tone={technical.emaTrend === "up" ? "up" : technical.emaTrend === "down" ? "down" : undefined}
        />
        <Stat label="신호강도" value={`${Math.max(technical.buyScore, technical.sellScore)}%`} />
      </div>
    </div>
  );
}
