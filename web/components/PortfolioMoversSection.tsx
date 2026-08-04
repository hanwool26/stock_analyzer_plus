import type { PortfolioMover, PortfolioMoversReport } from "@/lib/types";
import { formatSignedPct } from "@/lib/format";
import { formatDateTimeKorean } from "@/lib/date";
import MoverNewsButton from "./MoverNewsButton";

function MoverList({ movers, emptyLabel }: { movers: PortfolioMover[]; emptyLabel: string }) {
  if (movers.length === 0) {
    return <p className="text-xs text-slate-400 py-2">{emptyLabel}</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {movers.map((m) => (
        <li key={m.ticker} className="flex items-center justify-between gap-2 py-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">{m.name}</div>
            <div className="text-[11px] text-slate-400">{m.ticker}</div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`text-sm font-semibold tabular-nums ${
                m.changePct > 0 ? "text-red-600" : m.changePct < 0 ? "text-blue-600" : "text-slate-500"
              }`}
            >
              {formatSignedPct(m.changePct)}
            </span>
            <MoverNewsButton mover={m} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MarketCard({ label, report }: { label: string; report: PortfolioMoversReport | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-slate-900">{label}</h3>
        {report && <span className="text-[11px] text-slate-400">{formatDateTimeKorean(new Date(report.generatedAt))} 기준</span>}
      </div>

      {!report ? (
        <p className="text-sm text-slate-400 py-4 text-center">아직 생성된 리포트가 없습니다.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-red-600 mb-1">상승 TOP {report.gainers.length}</p>
            <MoverList movers={report.gainers} emptyLabel="상승 종목이 없습니다." />
          </div>
          <div>
            <p className="text-xs font-medium text-blue-600 mb-1">하락 TOP {report.losers.length}</p>
            <MoverList movers={report.losers} emptyLabel="하락 종목이 없습니다." />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortfolioMoversSection({
  krReport,
  usReport,
}: {
  krReport: PortfolioMoversReport | null;
  usReport: PortfolioMoversReport | null;
}) {
  return (
    <section>
      <h2 className="text-base font-bold text-slate-900 mb-3">장마감 등락률 TOP5 &amp; 관련 뉴스</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <MarketCard label="국내 (15:30 장마감 기준)" report={krReport} />
        <MarketCard label="미국 (05:00 장마감 기준)" report={usReport} />
      </div>
    </section>
  );
}
