import type { Recommendation } from "@/lib/types";
import { CONFIDENCE_LABELS, PERIOD_LABELS } from "@/lib/types";
import TechnicalBadges from "./TechnicalBadges";

const CONFIDENCE_STYLE: Record<Recommendation["confidence"], string> = {
  high: "bg-blue-50 text-blue-700 border-blue-200",
  medium: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            {rec.rank}
          </span>
          <div>
            <div className="font-bold text-slate-900">
              {rec.name} <span className="text-slate-400 font-normal">{rec.ticker}</span>
            </div>
            <div className="text-xs text-slate-500">
              {rec.market} &middot; {rec.sector}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${CONFIDENCE_STYLE[rec.confidence]}`}
          >
            {CONFIDENCE_LABELS[rec.confidence]}
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
            {PERIOD_LABELS[rec.period]}
          </span>
        </div>
      </div>

      <div className="text-xs font-semibold text-blue-600 mb-1">{rec.theme}</div>
      <p className="text-sm text-slate-700 leading-relaxed mb-3">{rec.rationale}</p>

      {rec.riskFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {rec.riskFlags.map((flag) => (
            <span
              key={flag}
              className="text-[11px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200"
            >
              ⚠ {flag}
            </span>
          ))}
        </div>
      )}

      <TechnicalBadges technical={rec.technical} region={rec.region} />

      {rec.sentiment && (
        <div className="mt-2 text-[11px] text-slate-400">
          뉴스 감성 점수 {rec.sentiment.score > 0 ? "+" : ""}
          {rec.sentiment.score.toFixed(2)}
          {rec.sentiment.marketauxValidated && " · 교차검증됨"}
        </div>
      )}
    </div>
  );
}
