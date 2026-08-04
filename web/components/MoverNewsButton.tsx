"use client";

import { useState } from "react";
import type { PortfolioMover } from "@/lib/types";
import { formatSignedPct } from "@/lib/format";

export default function MoverNewsButton({ mover }: { mover: PortfolioMover }) {
  const [open, setOpen] = useState(false);
  const hasNews = mover.newsSummary.length > 0 || mover.articles.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!hasNews}
        className="text-xs font-medium text-blue-600 hover:underline disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
      >
        관련 뉴스
      </button>

      {open && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-black/30 px-4 py-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-4 sm:p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {mover.name} <span className="text-xs font-normal text-slate-400">{mover.ticker}</span>
                </h3>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    mover.changePct > 0 ? "text-red-600" : mover.changePct < 0 ? "text-blue-600" : "text-slate-500"
                  }`}
                >
                  {formatSignedPct(mover.changePct)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-100"
              >
                닫기
              </button>
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
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-400 mb-1.5">참고 기사</p>
                <ul className="space-y-1">
                  {mover.articles.map((a, i) => (
                    <li key={i} className="text-xs">
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline line-clamp-1"
                      >
                        {a.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
