import { notFound } from "next/navigation";
import { getReport } from "@/lib/mock-reports";
import RecommendationCard from "@/components/RecommendationCard";
import CategoryIssueCard from "@/components/CategoryIssueCard";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ date: string; hour: string }>;
}) {
  const { date, hour } = await params;
  const report = getReport(date, Number(hour));

  if (!report) {
    notFound();
  }

  const kr = report.recommendations.filter((r) => r.region === "KR");
  const us = report.recommendations.filter((r) => r.region === "US");

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-bold text-slate-900 mb-1">
          {report.date} {String(report.hour).padStart(2, "0")}:00 리포트
        </h1>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm mt-3">
          <p className="text-sm text-slate-700 leading-relaxed">{report.marketContext}</p>
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900 mb-3">국내 추천 TOP 5</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {kr.map((rec) => (
            <RecommendationCard key={`${rec.region}-${rec.ticker}`} rec={rec} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900 mb-3">해외 추천 TOP 5</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {us.map((rec) => (
            <RecommendationCard key={`${rec.region}-${rec.ticker}`} rec={rec} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900 mb-3">카테고리별 이슈</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {report.categorySummaries.map((summary) => (
            <CategoryIssueCard key={summary.category} summary={summary} />
          ))}
        </div>
      </section>
    </div>
  );
}
