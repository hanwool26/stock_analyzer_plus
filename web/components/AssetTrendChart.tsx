"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { PortfolioSnapshot } from "@/app/generated/prisma/client";

export default function AssetTrendChart({ snapshots }: { snapshots: PortfolioSnapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        자산 추이를 표시하려면 데이터가 더 필요합니다. 며칠간 포트폴리오를 유지하면 추이 그래프가 채워집니다.
      </div>
    );
  }

  const data = snapshots
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((s) => ({
      date: s.date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }),
      총평가금액: Math.round(s.totalValue),
    }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" fontSize={12} stroke="#94a3b8" />
          <YAxis
            fontSize={12}
            stroke="#94a3b8"
            tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
            width={70}
          />
          <Tooltip formatter={(v) => Number(v).toLocaleString("ko-KR")} />
          <Line type="monotone" dataKey="총평가금액" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
