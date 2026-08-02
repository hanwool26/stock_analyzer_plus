"use client";

import { useRef, useState, useTransition } from "react";
import { importHoldings } from "@/app/portfolio/actions";

export default function ImportHoldingsDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    const krFile = formData.get("krFile");
    const usFile = formData.get("usFile");
    const hasKrFile = krFile instanceof File && krFile.size > 0;
    const hasUsFile = usFile instanceof File && usFile.size > 0;

    if (!hasKrFile && !hasUsFile) {
      setError("국내주식 또는 해외주식 CSV 파일을 하나 이상 선택해주세요.");
      return;
    }
    if (
      !window.confirm(
        "업로드한 파일에 해당하는 지역(국내/해외)의 기존 보유 종목과 거래 내역이 삭제되고 새 데이터로 교체됩니다. 계속할까요?"
      )
    ) {
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
            <p className="text-xs text-slate-500 mb-1">
              메리츠증권 MTS 앱에서 내보낸 엑셀 파일이 필요합니다. 국내/해외 중 하나만 올려도 됩니다.
            </p>
            <p className="text-xs text-slate-500 mb-4">
              업로드한 지역만 기존 보유 종목이 교체됩니다.
            </p>
            <form ref={formRef} action={handleSubmit} className="space-y-3">
              <label className="block text-xs text-slate-500">
                국내주식 CSV (korean_stocks.csv)
                <input
                  name="krFile"
                  type="file"
                  accept=".csv,.xlsx"
                  className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
                />
              </label>
              <label className="block text-xs text-slate-500">
                해외주식 CSV (global_stocks.csv)
                <input
                  name="usFile"
                  type="file"
                  accept=".csv,.xlsx"
                  className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
                />
              </label>

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
