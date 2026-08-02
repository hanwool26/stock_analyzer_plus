import { prisma } from "@/lib/db";
import { ensureDefaultMembers } from "./actions";
import { computeTotals } from "@/lib/finance";
import { formatKrw } from "@/lib/format";
import { formatDateOnlyISO, formatDateOnlyKorean } from "@/lib/date";
import AssetsSubNav from "@/components/AssetsSubNav";
import HouseholdTrendChart, { type HouseholdTrendPoint } from "@/components/HouseholdTrendChart";

export const dynamic = "force-dynamic";

export default async function AssetsSummaryPage() {
  await ensureDefaultMembers();

  const members = await prisma.familyMember.findMany({
    orderBy: { order: "asc" },
    include: { snapshots: { orderBy: { date: "asc" }, include: { items: true } } },
  });

  const rows = members.map((m) => {
    const latest = m.snapshots[m.snapshots.length - 1];
    const totals = latest ? computeTotals(latest.items) : { assetTotal: 0, liabilityTotal: 0, netWorth: 0 };
    return { member: m, latestDate: latest?.date ?? null, ...totals };
  });

  const grandTotal = rows.reduce(
    (acc, r) => ({
      assetTotal: acc.assetTotal + r.assetTotal,
      liabilityTotal: acc.liabilityTotal + r.liabilityTotal,
      netWorth: acc.netWorth + r.netWorth,
    }),
    { assetTotal: 0, liabilityTotal: 0, netWorth: 0 }
  );

  const allDates = Array.from(
    new Set(members.flatMap((m) => m.snapshots.map((s) => formatDateOnlyISO(s.date))))
  ).sort();

  const householdTrend: HouseholdTrendPoint[] = allDates.map((date) => {
    const totals = members.reduce(
      (acc, m) => {
        // snapshots are ordered asc by date, so the last one <= date is the carried-forward value
        const asOf = m.snapshots.filter((s) => formatDateOnlyISO(s.date) <= date).pop();
        if (!asOf) return acc;
        const t = computeTotals(asOf.items);
        return {
          assetTotal: acc.assetTotal + t.assetTotal,
          liabilityTotal: acc.liabilityTotal + t.liabilityTotal,
          netWorth: acc.netWorth + t.netWorth,
        };
      },
      { assetTotal: 0, liabilityTotal: 0, netWorth: 0 }
    );
    return { date, ...totals };
  });

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-slate-900">가계자산</h1>
        <p className="text-sm text-slate-500 mt-0.5">구성원별 자산/부채/순자산 현황과 추이를 관리합니다.</p>
      </div>

      <AssetsSubNav members={members.map((m) => ({ id: m.id, name: m.name }))} />

      <section className="mb-8">
        <h2 className="text-base font-bold text-slate-900 mb-3">가구 합계 추이</h2>
        <HouseholdTrendChart data={householdTrend} />
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900 mb-3">구성원별 최신 현황</h2>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400">
                <tr className="text-left">
                  <th className="px-4 py-2.5 font-medium">구성원</th>
                  <th className="px-4 py-2.5 font-medium">기준일</th>
                  <th className="px-4 py-2.5 font-medium text-right">자산</th>
                  <th className="px-4 py-2.5 font-medium text-right">부채</th>
                  <th className="px-4 py-2.5 font-medium text-right">순자산</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.member.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.member.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {r.latestDate ? formatDateOnlyKorean(r.latestDate) : "기록 없음"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKrw(r.assetTotal)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKrw(r.liabilityTotal)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-blue-600">
                      {formatKrw(r.netWorth)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="px-4 py-3" colSpan={2}>
                    합계
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatKrw(grandTotal.assetTotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatKrw(grandTotal.liabilityTotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-600">
                    {formatKrw(grandTotal.netWorth)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
