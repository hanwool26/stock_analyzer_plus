export type FinanceItemType = "ASSET" | "LIABILITY";

export const DEFAULT_ASSET_CATEGORIES = ["현금 및 유동자산", "투자자산", "사용자산", "저축", "기타"];
export const DEFAULT_LIABILITY_CATEGORIES = ["부채", "기타"];

export interface FinanceItemInput {
  type: FinanceItemType;
  category: string;
  name: string;
  amount: number;
  note?: string;
}

export interface FinanceItemLike {
  type: string;
  category: string;
  name: string;
  amount: number;
  note?: string | null;
}

export interface SnapshotTotals {
  assetTotal: number;
  liabilityTotal: number;
  netWorth: number;
}

export function computeTotals(items: FinanceItemLike[]): SnapshotTotals {
  const assetTotal = items.filter((i) => i.type === "ASSET").reduce((s, i) => s + i.amount, 0);
  const liabilityTotal = items
    .filter((i) => i.type === "LIABILITY")
    .reduce((s, i) => s + i.amount, 0);
  return { assetTotal, liabilityTotal, netWorth: assetTotal - liabilityTotal };
}

export function groupByCategory<T extends FinanceItemLike>(
  items: T[],
  type: FinanceItemType
): { category: string; items: T[]; subtotal: number }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    if (item.type !== type) continue;
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return Array.from(groups.entries()).map(([category, list]) => ({
    category,
    items: list,
    subtotal: list.reduce((s, i) => s + i.amount, 0),
  }));
}
