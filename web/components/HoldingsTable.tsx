"use client";

import { useState, useTransition } from "react";
import type { Holding } from "@/app/generated/prisma/client";
import { addTransaction, deleteHolding } from "@/app/portfolio/actions";
import { formatCurrency } from "@/lib/format";
import ConfirmDeleteButton from "./ConfirmDeleteButton";

function TransactionRow({ holding }: { holding: Holding }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addTransaction(formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "거래 등록에 실패했습니다.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-blue-600 hover:underline"
      >
        {open ? "닫기" : "거래 추가"}
      </button>
      {open && (
        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          <form action={handleSubmit} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="holdingId" value={holding.id} />
            <label className="text-xs text-slate-500">
              구분
              <select
                name="type"
                className="mt-1 block rounded-md border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="BUY">매수</option>
                <option value="SELL">매도</option>
              </select>
            </label>
            <label className="text-xs text-slate-500">
              수량
              <input
                name="quantity"
                type="number"
                step="any"
                min="0"
                required
                className="mt-1 block w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-slate-500">
              가격
              <input
                name="price"
                type="number"
                step="any"
                min="0"
                required
                className="mt-1 block w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "등록 중..." : "등록"}
            </button>
          </form>
          {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </>
  );
}

export default function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        아직 등록된 보유 종목이 없습니다. &ldquo;+ 종목 추가&rdquo;로 시작해보세요.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-xs text-slate-400">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-medium">종목</th>
              <th className="px-4 py-2.5 font-medium text-right">수량</th>
              <th className="px-4 py-2.5 font-medium text-right">평단가</th>
              <th className="px-4 py-2.5 font-medium text-right">평가금액</th>
              <th className="px-4 py-2.5 font-medium"></th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {holdings.map((h) => (
              <tr key={h.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{h.name}</div>
                  <div className="text-xs text-slate-400">
                    {h.ticker} &middot; {h.region === "KR" ? "국내" : "해외"}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{h.quantity.toLocaleString("ko-KR")}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(h.avgPrice, h.currency)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">
                  {formatCurrency(h.quantity * h.avgPrice, h.currency)}
                </td>
                <td className="px-4 py-3">
                  <TransactionRow holding={h} />
                </td>
                <td className="px-4 py-3 text-right">
                  <ConfirmDeleteButton
                    action={deleteHolding.bind(null, h.id)}
                    confirmMessage={`${h.name}(${h.ticker})을(를) 삭제할까요? 관련 거래 내역도 함께 삭제되며 되돌릴 수 없습니다.`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2.5 text-[11px] text-slate-400 border-t border-slate-100">
        * 실시간 시세 연동 전으로 평가금액은 매입 평단가 기준 근사치입니다.
      </p>
    </div>
  );
}
