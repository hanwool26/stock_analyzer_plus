import { prisma } from "@/lib/db";
import { ensureTodaySnapshot } from "./actions";
import HoldingFormDialog from "@/components/HoldingFormDialog";
import HoldingsTable from "@/components/HoldingsTable";
import AssetTrendChart from "@/components/AssetTrendChart";
import { formatKrw } from "@/lib/format";

export const dynamic = "force-dynamic";

function toKrw(value: number, currency: string, usdKrwRate: number): number {
  return currency === "USD" ? value * usdKrwRate : value;
}

const USD_KRW_RATE = 1380; // 실시간 환율 연동 전 임시 고정값

export default async function PortfolioPage() {
  await ensureTodaySnapshot();

  const [holdings, snapshots] = await Promise.all([
    prisma.holding.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.portfolioSnapshot.findMany({ orderBy: { date: "asc" } }),
  ]);

  const totalValueKrw = holdings.reduce(
    (sum, h) => sum + toKrw(h.quantity * h.avgPrice, h.currency, USD_KRW_RATE),
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">포트폴리오</h1>
          <p className="text-sm text-slate-500 mt-0.5">보유 종목과 자산 추이를 관리합니다.</p>
        </div>
        <HoldingFormDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs text-slate-400 mb-1">총 평가금액 (KRW 환산)</div>
          <div className="text-2xl font-bold text-slate-900">{formatKrw(totalValueKrw)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs text-slate-400 mb-1">보유 종목 수</div>
          <div className="text-2xl font-bold text-slate-900">{holdings.length}개</div>
        </div>
      </div>

      <section>
        <h2 className="text-base font-bold text-slate-900 mb-3">자산 추이</h2>
        <AssetTrendChart snapshots={snapshots} />
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900 mb-3">보유 종목</h2>
        <HoldingsTable holdings={holdings} />
      </section>
    </div>
  );
}
