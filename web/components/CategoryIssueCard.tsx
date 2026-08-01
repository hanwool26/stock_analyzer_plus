import type { CategorySummary, Persistence } from "@/lib/types";
import { CATEGORY_LABELS, PERSISTENCE_LABELS } from "@/lib/types";

const PERSISTENCE_STYLE: Record<Persistence, string> = {
  shock: "bg-red-50 text-red-600 border-red-200",
  structural: "bg-emerald-50 text-emerald-700 border-emerald-200",
  recurring: "bg-blue-50 text-blue-600 border-blue-200",
};

export default function CategoryIssueCard({ summary }: { summary: CategorySummary }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 mb-3">
        {CATEGORY_LABELS[summary.category]}
      </h3>
      <ul className="space-y-2.5">
        {summary.bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              className={`shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PERSISTENCE_STYLE[bullet.persistence]}`}
            >
              {PERSISTENCE_LABELS[bullet.persistence]}
            </span>
            <span className="text-sm text-slate-700 leading-snug">{bullet.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
