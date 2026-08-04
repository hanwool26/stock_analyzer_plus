import Link from "next/link";
import { listReports } from "@/lib/reports";

export default async function ReportsPage() {
  const reports = await listReports();

  return (
    <div>
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
    </div>
  );
}
