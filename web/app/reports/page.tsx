import Link from "next/link";
import { listReports } from "@/lib/reports";
import { listPortfolioMoversReports } from "@/lib/portfolio-movers-reports";

const MARKET_LABEL: Record<string, string> = { KR: "국내", US: "미국" };

export default async function ReportsPage() {
  const [reports, moversReports] = await Promise.all([listReports(), listPortfolioMoversReports()]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-bold text-slate-900 mb-1">리포트 히스토리</h1>
        <p className="text-sm text-slate-500 mb-6">
          평일 07:00 / 12:00 / 19:00 기준으로 생성된 분석 리포트 목록입니다.
        </p>
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {reports.map((report) => (
            <li key={`${report.date}-${report.hour}`}>
              <Link
                href={`/reports/${report.date}/${report.hour}`}
                className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">
                    {report.date} {String(report.hour).padStart(2, "0")}:00
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-md">
                    {report.marketContext}
                  </div>
                </div>
                <span className="text-sm text-blue-600 shrink-0">보기 &rarr;</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-1">포트폴리오 종목 뉴스</h2>
        <p className="text-sm text-slate-500 mb-6">
          보유 종목 중 장마감 등락률 TOP5 상승/하락 종목의 뉴스 요약 리포트입니다 (국내 15:30 / 미국 05:00 기준).
        </p>
        {moversReports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            아직 생성된 리포트가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {moversReports.map((report) => (
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
        )}
      </section>
    </div>
  );
}
