import { listReports } from "@/lib/reports";
import { listPortfolioMoversReports } from "@/lib/portfolio-movers-reports";
import ReportsPageTabs from "@/components/ReportsPageTabs";

// MongoDB에서 매번 최신 리포트를 읽어야 하므로 정적 프리렌더링을 막는다.
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [reports, moversReports] = await Promise.all([listReports(), listPortfolioMoversReports()]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">리포트</h1>
      <ReportsPageTabs reports={reports} moversReports={moversReports} />
    </div>
  );
}
