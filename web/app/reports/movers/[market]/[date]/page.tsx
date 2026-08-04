import { notFound } from "next/navigation";
import { getPortfolioMoversReport } from "@/lib/portfolio-movers-reports";
import { formatSignedPct } from "@/lib/format";
import { formatDateTimeKorean } from "@/lib/date";
import type { PortfolioMover, Region } from "@/lib/types";

const MARKET_LABEL: Record<string, string> = { KR: "국내", US: "미국" };

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
        <h2 className="text-base font-bold text-red-600 mb-3">상승 TOP {report.gainers.length}</h2>
        {report.gainers.length === 0 ? (
          <p className="text-sm text-slate-400">상승 종목이 없습니다.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {report.gainers.map((m) => (
              <MoverCard key={m.ticker} mover={m} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-bold text-blue-600 mb-3">하락 TOP {report.losers.length}</h2>
        {report.losers.length === 0 ? (
          <p className="text-sm text-slate-400">하락 종목이 없습니다.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {report.losers.map((m) => (
              <MoverCard key={m.ticker} mover={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
