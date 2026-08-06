"use client";

import { useMemo, useState } from "react";
import { groupByCategory, type FinanceItemLike } from "@/lib/finance";
import { formatKrw } from "@/lib/format";

interface IndexedItem extends FinanceItemLike {
  _idx: number;
}

export interface MemberItemData {
  memberId: string;
  memberName: string;
  latestDateLabel: string | null;
  items: FinanceItemLike[];
}

function keyFor(memberId: string, item: IndexedItem) {
  return `${memberId}::${item.type}::${item.category}::${item.name}::${item._idx}`;
}

function ItemGroupList({
  label,
  groups,
  memberId,
  selected,
  onToggle,
}: {
  label: string;
  groups: { category: string; items: IndexedItem[]; subtotal: number }[];
  memberId: string;
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  if (groups.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-slate-400 mb-1.5">{label}</div>
      <div className="space-y-2.5">
        {groups.map((g) => (
          <div key={g.category}>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>{g.category}</span>
              <span>{formatKrw(g.subtotal)}</span>
            </div>
            <div className="space-y-1">
              {g.items.map((item) => {
                const key = keyFor(memberId, item);
                const isSelected = selected.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onToggle(key)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-blue-100 text-blue-900 ring-1 ring-inset ring-blue-300"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>
                      {item.name}
                      {item.note && <span className="text-slate-400 text-xs ml-1.5">({item.note})</span>}
                    </span>
                    <span className="tabular-nums font-medium">{formatKrw(item.amount)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HouseholdItemSelector({ members }: { members: MemberItemData[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const indexedMembers = useMemo(
    () =>
      members.map((m) => ({
        ...m,
        items: m.items.map((item, idx) => ({ ...item, _idx: idx })) as IndexedItem[],
      })),
    [members]
  );

  const amountByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of indexedMembers) {
      for (const item of m.items) {
        map.set(keyFor(m.memberId, item), item.amount);
      }
    }
    return map;
  }, [indexedMembers]);

  const selectedTotal = useMemo(() => {
    let sum = 0;
    for (const key of selected) sum += amountByKey.get(key) ?? 0;
    return sum;
  }, [selected, amountByKey]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasData = members.some((m) => m.items.length > 0);
  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        비교할 항목이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/95 backdrop-blur px-4 py-3 shadow-sm">
        <div className="text-sm text-blue-900">
          <span className="font-semibold">{selected.size}개 항목 선택됨</span>
          <span className="ml-2 text-blue-400 hidden sm:inline">항목을 클릭해 선택/해제하고 합계를 확인하세요.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-700 tabular-nums">{formatKrw(selectedTotal)}</span>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              선택 초기화
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {indexedMembers.map((m) => {
          const assetGroups = groupByCategory(m.items, "ASSET");
          const liabilityGroups = groupByCategory(m.items, "LIABILITY");
          return (
            <div key={m.memberId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">{m.memberName}</h3>
                <span className="text-xs text-slate-400">{m.latestDateLabel ?? "기록 없음"}</span>
              </div>
              {m.items.length === 0 ? (
                <p className="text-xs text-slate-400">등록된 항목이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  <ItemGroupList
                    label="자산"
                    groups={assetGroups}
                    memberId={m.memberId}
                    selected={selected}
                    onToggle={toggle}
                  />
                  <ItemGroupList
                    label="부채"
                    groups={liabilityGroups}
                    memberId={m.memberId}
                    selected={selected}
                    onToggle={toggle}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
