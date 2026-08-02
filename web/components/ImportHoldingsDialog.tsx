"use client";

import { useRef, useState, useTransition } from "react";
import { importHoldings } from "@/app/portfolio/actions";

export default function ImportHoldingsDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    if (!window.confirm("가져오면 기존 보유 종목과 거래 내역이 모두 삭제되고 업로드한 파일 내용으로 교체됩니다. 계속할까요?")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await importHoldings(formData);
        formRef.current?.reset();
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "가져오기에 실패했습니다.");
      }
    });
  }

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold px-4 py-2 hover:bg-slate-50 transition-colors"
      >
        엑셀 가져오기
      </button>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-black/30 px-4 py-8">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 sm:p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">엑셀/CSV로 가져오기</h3>
            <p className="text-xs text-slate-500 mb-4">
              증권사 잔고 CSV(종목명/잔고수량/매수금액/잔고구분 컬럼 포함) 또는 xlsx 파일을 업로드하면
              기존 보유 종목이 전부 교체됩니다.
            </p>
            <form ref={formRef} action={handleSubmit} className="space-y-3">
              <input
                name="file"
                type="file"
                accept=".csv,.xlsx"
                required
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
              />

              {error && <p className="text-xs text-red-600 whitespace-pre-line">{error}</p>}

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
                  {pending ? "가져오는 중..." : "가져오기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
