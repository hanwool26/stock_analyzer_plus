"use client";

import { useState, useTransition } from "react";
import { addFamilyMember } from "@/app/assets/actions";

export default function AddMemberDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await addFamilyMember(name);
        setName("");
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "구성원 추가에 실패했습니다.");
      }
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
      >
        + 구성원 추가
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-2">
            <label className="text-xs text-slate-500">
              이름
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 이한울"
                className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </label>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
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
      )}
    </div>
  );
}
