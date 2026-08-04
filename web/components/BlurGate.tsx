"use client";

import { useState } from "react";
import { usePrivacyGate } from "./PrivacyGateProvider";

export default function BlurGate({ children }: { children: React.ReactNode }) {
  const { pinRequired, unlocked, pending, error, unlock } = usePrivacyGate();
  const [pin, setPin] = useState("");

  if (!pinRequired || unlocked) {
    return <>{children}</>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await unlock(pin);
    if (ok) setPin("");
  }

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none blur-md">
        {children}
      </div>
      <div className="absolute inset-0 flex items-start justify-center pt-16">
        <form
          onSubmit={handleSubmit}
          className="w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg text-center"
        >
          <p className="text-sm font-medium text-slate-700 mb-2">🔒 PIN을 입력하면 볼 수 있어요</p>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-center"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={pending || !pin}
            className="mt-2 w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? "확인 중..." : "확인"}
          </button>
        </form>
      </div>
    </div>
  );
}
