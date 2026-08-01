import { computeTotals, groupByCategory, type FinanceItemLike } from "@/lib/finance";
import { formatKrw } from "@/lib/format";
import { formatDateOnlyISO, formatDateOnlyKorean } from "@/lib/date";
import { deleteSnapshot } from "@/app/assets/actions";
import ConfirmDeleteButton from "./ConfirmDeleteButton";
import SnapshotFormDialog from "./SnapshotFormDialog";
import CategoryPieChart from "./CategoryPieChart";

function CategoryTable({ groups }: { groups: { category: string; items: FinanceItemLike[]; subtotal: number }[] }) {
  if (groups.length === 0) {
    return <p className="text-xs text-slate-400">항목 없음</p>;
  }
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.category}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>{g.category}</span>
            <span>{formatKrw(g.subtotal)}</span>
          </div>
          <ul className="text-sm divide-y divide-slate-100 rounded-md border border-slate-100">
            {g.items.map((item, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-1.5">
                <span className="text-slate-700">
                  {item.name}
                  {item.note && <span className="text-slate-400 text-xs ml-1.5">({item.note})</span>}
                </span>
                <span className="tabular-nums font-medium text-slate-900">
                  {formatKrw(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function SnapshotBreakdown({
  snapshot,
  memberId,
  assetCategories,
  liabilityCategories,
}: {
  snapshot: {
    id: string;
    date: Date;
    memo: string | null;
    items: FinanceItemLike[];
  };
  memberId: string;
  assetCategories: string[];
  liabilityCategories: string[];
}) {
  const { assetTotal, liabilityTotal, netWorth } = computeTotals(snapshot.items);
  const assetGroups = groupByCategory(snapshot.items, "ASSET");
  const liabilityGroups = groupByCategory(snapshot.items, "LIABILITY");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="font-bold text-slate-900">{formatDateOnlyKorean(snapshot.date)} 기준</div>
          {snapshot.memo && <div className="text-xs text-slate-400 mt-0.5">{snapshot.memo}</div>}
        </div>
        <div className="flex items-center gap-3">
          <SnapshotFormDialog
            memberId={memberId}
            assetCategories={assetCategories}
            liabilityCategories={liabilityCategories}
            initial={{
              date: formatDateOnlyISO(snapshot.date),
              memo: snapshot.memo,
              items: snapshot.items.map((i) => ({
                type: i.type as "ASSET" | "LIABILITY",
                category: i.category,
                name: i.name,
                amount: i.amount,
                note: i.note,
              })),
            }}
          />
          <ConfirmDeleteButton
            action={deleteSnapshot.bind(null, snapshot.id)}
            confirmMessage={`${formatDateOnlyKorean(snapshot.date)} 스냅샷을 삭제할까요? 되돌릴 수 없습니다.`}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-5">
        <div>
          <h4 className="text-sm font-bold text-slate-900 mb-2">자산 구성</h4>
          <CategoryPieChart title="자산" groups={assetGroups} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 mb-2">부채 구성</h4>
          <CategoryPieChart title="부채" groups={liabilityGroups} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-5">
        <div>
          <h4 className="text-sm font-bold text-slate-900 mb-2">자산</h4>
          <CategoryTable groups={assetGroups} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 mb-2">부채</h4>
          <CategoryTable groups={liabilityGroups} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
        <div>
          <div className="text-[11px] text-slate-400">자산 합계</div>
          <div className="text-sm font-bold text-slate-900">{formatKrw(assetTotal)}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">부채 합계</div>
          <div className="text-sm font-bold text-slate-900">{formatKrw(liabilityTotal)}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">순자산</div>
          <div className="text-sm font-bold text-blue-600">{formatKrw(netWorth)}</div>
        </div>
      </div>
    </div>
  );
}
