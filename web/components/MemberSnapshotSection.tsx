"use client";

import { useMemo, useState } from "react";
import { computeTotals, type FinanceItemLike } from "@/lib/finance";
import { formatDateOnlyISO } from "@/lib/date";
import NetWorthTrendChart from "./NetWorthTrendChart";
import SnapshotBreakdown from "./SnapshotBreakdown";

interface SnapshotData {
  id: string;
  date: Date;
  memo: string | null;
  items: FinanceItemLike[];
}

export default function MemberSnapshotSection({
  memberId,
  memberName,
  snapshots,
  assetCategories,
  liabilityCategories,
}: {
  memberId: string;
  memberName: string;
  snapshots: SnapshotData[];
  assetCategories: string[];
  liabilityCategories: string[];
}) {
  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime()),
    [snapshots]
  );
  const latest = sorted[sorted.length - 1];
  const latestDate = latest ? formatDateOnlyISO(latest.date) : undefined;

  const [selectedDate, setSelectedDate] = useState<string | undefined>(latestDate);

  const series = useMemo(
    () => [
      {
        name: memberName,
        points: sorted.map((s) => ({
          date: formatDateOnlyISO(s.date),
          netWorth: computeTotals(s.items).netWorth,
        })),
      },
    ],
    [sorted, memberName]
  );

  if (!latest) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        아직 등록된 자산 스냅샷이 없습니다. &ldquo;+ 스냅샷 추가&rdquo;로 시작해보세요.
      </div>
    );
  }

  const selected = sorted.find((s) => formatDateOnlyISO(s.date) === selectedDate) ?? latest;

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900">순자산 추이</h3>
          <p className="text-xs text-slate-400">그래프의 지점을 클릭하면 아래 상세 내역이 바뀝니다.</p>
        </div>
        <NetWorthTrendChart series={series} onPointClick={setSelectedDate} selectedDate={selectedDate} />
      </section>

      <section>
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-base font-bold text-slate-900">스냅샷 상세</h3>
          {selectedDate !== latestDate && (
            <button
              onClick={() => setSelectedDate(latestDate)}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              최신으로 돌아가기
            </button>
          )}
        </div>
        <SnapshotBreakdown
          snapshot={selected}
          memberId={memberId}
          assetCategories={assetCategories}
          liabilityCategories={liabilityCategories}
        />
      </section>
    </div>
  );
}
