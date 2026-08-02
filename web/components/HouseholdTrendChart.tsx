"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export interface HouseholdTrendPoint {
  date: string; // "YYYY-MM-DD"
  assetTotal: number;
  liabilityTotal: number;
  netWorth: number;
}

const SERIES = [
  { key: "자산", color: "#2563eb", defaultVisible: false },
  { key: "부채", color: "#dc2626", defaultVisible: false },
  { key: "순자산", color: "#059669", defaultVisible: true },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

export default function HouseholdTrendChart({ data }: { data: HouseholdTrendPoint[] }) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>(() =>
    Object.fromEntries(SERIES.map((s) => [s.key, s.defaultVisible])) as Record<SeriesKey, boolean>
  );

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        추이를 표시하려면 스냅샷이 2개 이상 필요합니다.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date,
    자산: d.assetTotal,
    부채: d.liabilityTotal,
    순자산: d.netWorth,
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap gap-4">
        {SERIES.map((s) => (
          <label key={s.key} className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visible[s.key]}
              onChange={() => setVisible((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
              className="h-3.5 w-3.5 rounded accent-current"
              style={{ color: s.color }}
            />
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.key}
          </label>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" fontSize={12} stroke="#94a3b8" />
          <YAxis
            fontSize={12}
            stroke="#94a3b8"
            tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
            width={80}
          />
          <Tooltip formatter={(v) => Number(v).toLocaleString("ko-KR")} />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              hide={!visible[s.key]}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
