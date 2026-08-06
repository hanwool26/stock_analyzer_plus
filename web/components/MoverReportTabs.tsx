"use client";

import { useState } from "react";
import type { PortfolioMover } from "@/lib/types";
import { formatSignedPct } from "@/lib/format";

type MoverView = "gainers" | "losers";

function MoverCard({ mover }: { mover: PortfolioMover }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{mover.name}</h3>
          <p className="text-xs text-slate-400">{mover.ticker}</p>
        </div>
        <span
          className={`text-sm font-semibold tabular-nums shrink-0 ${
            mover.changePct > 0 ? "text-red-600" : mover.changePct < 0 ? "text-blue-600" : "text-slate-500"
          }`}
        >
          {formatSignedPct(mover.changePct)}
        </span>
      </div>

      {mover.newsSummary.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-slate-700 leading-relaxed list-disc list-inside">
          {mover.newsSummary.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">관련 뉴스 요약이 없습니다.</p>
      )}

      {mover.articles.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium text-slate-400 mb-1.5">참고 기사</p>
          <ul className="space-y-1">
            {mover.articles.map((a, i) => (
              <li key={i} className="text-xs">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {a.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function MoverReportTabs({
  gainers,
  losers,
}: {
  gainers: PortfolioMover[];
  losers: PortfolioMover[];
}) {
  const [view, setView] = useState<MoverView>("gainers");
  const movers = view === "gainers" ? gainers : losers;
  const emptyLabel = view === "gainers" ? "상승 종목이 없습니다." : "하락 종목이 없습니다.";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <button
          type="button"
          onClick={() => setView("gainers")}
          className={
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
            (view === "gainers" ? "bg-red-600 text-white" : "text-slate-500 hover:bg-slate-100")
          }
        >
          상승 TOP {gainers.length}
        </button>
        <button
          type="button"
          onClick={() => setView("losers")}
          className={
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
            (view === "losers" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100")
          }
        >
          하락 TOP {losers.length}
        </button>
      </div>

      {movers.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {movers.map((m) => (
            <MoverCard key={m.ticker} mover={m} />
          ))}
        </div>
      )}
    </div>
  );
}
