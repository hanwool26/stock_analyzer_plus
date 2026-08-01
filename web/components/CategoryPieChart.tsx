"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { formatKrw } from "@/lib/format";

// Fixed categorical order — same slot order used across the app's category charts.
const CATEGORICAL_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
];
const OTHER_COLOR = "#898781";
const OTHER_CATEGORY_LABEL = "그 외";
const OTHER_ITEM_LABEL = "기타";
const MAX_CATEGORIES = 7;
const MAX_ITEMS_PER_CATEGORY = 5;
// How far the lightest item tint travels toward white — keeps it distinguishable from the surface.
const MAX_TINT = 0.55;

interface FinanceLineLike {
  name: string;
  amount: number;
}

interface CategoryGroup {
  category: string;
  subtotal: number;
  items: FinanceLineLike[];
}

interface CategorySlice {
  category: string;
  subtotal: number;
  items: FinanceLineLike[];
}

interface ItemSlice {
  key: string;
  label: string;
  amount: number;
  color: string;
}

function prepareCategorySlices(groups: CategoryGroup[]): CategorySlice[] {
  const sorted = groups.filter((g) => g.subtotal > 0).sort((a, b) => b.subtotal - a.subtotal);
  if (sorted.length <= MAX_CATEGORIES) return sorted;
  const head = sorted.slice(0, MAX_CATEGORIES);
  const tail = sorted.slice(MAX_CATEGORIES);
  const restTotal = tail.reduce((s, g) => s + g.subtotal, 0);
  const restItems = tail.flatMap((g) => g.items);
  return [...head, { category: OTHER_CATEGORY_LABEL, subtotal: restTotal, items: restItems }];
}

function colorFor(category: string, index: number): string {
  return category === OTHER_CATEGORY_LABEL
    ? OTHER_COLOR
    : CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

// Monotone lightness step toward white — the ordinal-ramp technique, scoped to one category's hue.
function tint(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function prepareItemSlices(categorySlices: CategorySlice[]): ItemSlice[] {
  const result: ItemSlice[] = [];
  categorySlices.forEach((cat, catIndex) => {
    const items = cat.items.filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount);
    const head = items.slice(0, MAX_ITEMS_PER_CATEGORY);
    const tailTotal = items.slice(MAX_ITEMS_PER_CATEGORY).reduce((s, i) => s + i.amount, 0);
    const finalItems = tailTotal > 0 ? [...head, { name: OTHER_ITEM_LABEL, amount: tailTotal }] : head;
    const baseColor = colorFor(cat.category, catIndex);
    finalItems.forEach((item, idx) => {
      const tintAmount = finalItems.length <= 1 ? 0 : (idx / (finalItems.length - 1)) * MAX_TINT;
      result.push({
        key: `${cat.category}__${item.name}__${idx}`,
        label: `${cat.category} · ${item.name}`,
        amount: item.amount,
        color: tint(baseColor, tintAmount),
      });
    });
  });
  return result;
}

export default function CategoryPieChart({ title, groups }: { title: string; groups: CategoryGroup[] }) {
  const categorySlices = prepareCategorySlices(groups);
  const total = categorySlices.reduce((s, g) => s + g.subtotal, 0);

  if (categorySlices.length === 0 || total === 0) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center text-xs text-slate-400">
        표시할 항목이 없습니다
      </div>
    );
  }

  const itemSlices = prepareItemSlices(categorySlices);

  return (
    <div>
      <div className="relative mx-auto" style={{ width: 210, height: 210 }}>
        <PieChart width={210} height={210}>
          <Pie
            data={itemSlices}
            dataKey="amount"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={98}
            paddingAngle={itemSlices.length > 1 ? 1 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {itemSlices.map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            wrapperStyle={{ zIndex: 50 }}
            formatter={(value, name) => {
              const amount = Number(value);
              return [`${formatKrw(amount)} (${((amount / total) * 100).toFixed(1)}%)`, name];
            }}
          />
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-slate-400">{title}</span>
          <span className="text-sm font-bold text-slate-900">{formatKrw(total)}</span>
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-xs">
        {categorySlices.map((s, i) => (
          <li key={s.category} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: colorFor(s.category, i) }}
              />
              <span className="truncate text-slate-600">{s.category}</span>
            </span>
            <span className="shrink-0 tabular-nums text-slate-500">
              {((s.subtotal / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
