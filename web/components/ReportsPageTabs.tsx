"use client";

import { useState } from "react";
import Link from "next/link";
import type { PortfolioMoversReport, Report } from "@/lib/types";
import { formatReportTime } from "@/lib/format";

const MARKET_LABEL: Record<string, string> = { KR: "국내", US: "미국" };

type Tab = "history" | "movers";

function ReportHistoryList({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        아직 생성된 리포트가 없습니다.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {reports.map((report) => (
        <li key={`${report.date}-${report.hour}`}>
          <Link
            href={`/reports/${report.date}/${report.hour}`}
            className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900">
                {report.date} {formatReportTime(report.hour, report.minute)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-md">{report.marketContext}</div>
            </div>
            <span className="text-sm text-blue-600 shrink-0">보기 &rarr;</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MoversHistoryList({ reports }: { reports: PortfolioMoversReport[] }) {
  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        아직 생성된 리포트가 없습니다.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {reports.map((report) => (
        <li key={`${report.market}-${report.date}`}>
          <Link
            href={`/reports/movers/${report.market}/${report.date}`}
            className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900">
                {report.date} &middot; {MARKET_LABEL[report.market] ?? report.market}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                상승 {report.gainers.length}종목 &middot; 하락 {report.losers.length}종목
              </div>
            </div>
            <span className="text-sm text-blue-600 shrink-0">보기 &rarr;</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ReportsPageTabs({
  reports,
  moversReports,
}: {
  reports: Report[];
  moversReports: PortfolioMoversReport[];
}) {
  const [tab, setTab] = useState<Tab>("history");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-6">
        <button
          type="button"
          onClick={() => setTab("history")}
          className={
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
            (tab === "history" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")
          }
        >
          리포트 히스토리
        </button>
        <button
          type="button"
          onClick={() => setTab("movers")}
          className={
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
            (tab === "movers" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")
          }
        >
          상승률 TOP5 / 하락률 TOP5
        </button>
      </div>

      {tab === "history" ? (
        <section>
          <p className="text-sm text-slate-500 mb-6">평일 07:30 / 19:30 기준으로 생성된 분석 리포트 목록입니다.</p>
          <ReportHistoryList reports={reports} />
        </section>
      ) : (
        <section>
          <p className="text-sm text-slate-500 mb-6">
            보유 종목 중 장마감 등락률 TOP5 상승/하락 종목의 뉴스 요약 리포트입니다 (국내 15:30 / 미국 05:00 기준).
          </p>
          <MoversHistoryList reports={moversReports} />
        </section>
      )}
    </div>
  );
}
