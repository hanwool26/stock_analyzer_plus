"use client";

import { useState } from "react";
import { usePrivacyGate } from "./PrivacyGateProvider";

export default function PinLockControl() {
  const { pinRequired, unlocked, pending, error, unlock, lock } = usePrivacyGate();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");

  if (!pinRequired) return null;

  if (unlocked) {
    return (
      <button
        onClick={lock}
        title="포트폴리오 · AI 코칭 다시 잠그기"
        className="shrink-0 rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-500 hover:border-slate-400 hover:text-slate-700"
      >
        🔓 잠금
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await unlock(pin);
    if (ok) {
      setPin("");
      setOpen(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        title="PIN 입력하여 포트폴리오 · AI 코칭 보기"
        className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-500 hover:border-slate-400 hover:text-slate-700"
      >
        🔒 PIN
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={pending || !pin}
                className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {pending ? "확인 중..." : "확인"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
