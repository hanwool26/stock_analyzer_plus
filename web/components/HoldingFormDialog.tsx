"use client";

import { useRef, useState, useTransition } from "react";
import { addHolding } from "@/app/portfolio/actions";

export default function HoldingFormDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addHolding(formData);
        formRef.current?.reset();
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "종목 추가에 실패했습니다.");
      }
    });
  }

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-slate-900 text-white text-sm font-semibold px-4 py-2 hover:bg-slate-700 transition-colors"
      >
        + 종목 추가
      </button>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-4">보유 종목 추가</h3>
            <form ref={formRef} action={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-slate-500">
                  티커
                  <input
                    name="ticker"
                    required
                    placeholder="005930"
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  종목명
                  <input
                    name="name"
                    required
                    placeholder="삼성전자"
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-slate-500">
                  지역
                  <select
                    name="region"
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  >
                    <option value="KR">국내</option>
                    <option value="US">해외</option>
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  통화
                  <select
                    name="currency"
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  >
                    <option value="KRW">KRW</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-slate-500">
                  수량
                  <input
                    name="quantity"
                    type="number"
                    step="any"
                    min="0"
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  매입 단가
                  <input
                    name="price"
                    type="number"
                    step="any"
                    min="0"
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                </label>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {pending ? "추가 중..." : "추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
