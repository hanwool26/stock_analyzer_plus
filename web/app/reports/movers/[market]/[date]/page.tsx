import { notFound } from "next/navigation";
import { getPortfolioMoversReport } from "@/lib/portfolio-movers-reports";
import { formatDateTimeKorean } from "@/lib/date";
import type { Region } from "@/lib/types";
import MoverReportTabs from "@/components/MoverReportTabs";

const MARKET_LABEL: Record<string, string> = { KR: "국내", US: "미국" };

// MongoDB에서 매번 최신 리포트를 읽어야 하므로 정적 프리렌더링을 막는다.
export const dynamic = "force-dynamic";

export default async function PortfolioMoversReportPage({
  params,
}: {
  params: Promise<{ market: string; date: string }>;
}) {
  const { market, date } = await params;
  if (market !== "KR" && market !== "US") {
    notFound();
  }

  const report = await getPortfolioMoversReport(market as Region, date);
  if (!report) {
    notFound();
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-bold text-slate-900 mb-1">
          {report.date} {MARKET_LABEL[report.market] ?? report.market} 포트폴리오 등락률 TOP5 리포트
        </h1>
        <p className="text-sm text-slate-500">{formatDateTimeKorean(new Date(report.generatedAt))} 생성</p>
      </section>

      <section>
        <MoverReportTabs gainers={report.gainers} losers={report.losers} />
      </section>
    </div>
  );
}
