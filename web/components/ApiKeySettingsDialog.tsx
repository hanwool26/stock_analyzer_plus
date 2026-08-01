"use client";

import { useState, useTransition } from "react";
import { saveApiKey } from "@/app/coaching/actions";

interface ApiKeyStatusProps {
  configured: boolean;
  source: "db" | "env" | null;
  masked: string | null;
}

export default function ApiKeySettingsDialog({ status }: { status: ApiKeyStatusProps }) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await saveApiKey(apiKey);
        setApiKey("");
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "API 키 저장에 실패했습니다.");
      }
    });
  }

  const statusLabel = status.configured
    ? status.source === "db"
      ? `설정됨 (${status.masked})`
      : "설정됨 (환경변수)"
    : "미설정";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          "rounded-full border px-3 py-1.5 text-sm font-medium " +
          (status.configured
            ? "border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700"
            : "border-dashed border-amber-400 text-amber-600 hover:border-amber-500")
        }
      >
        API 키 {statusLabel}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-2">
            <label className="text-xs text-slate-500">
              Anthropic API 키
              <input
                autoFocus
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </label>
            <p className="text-xs text-slate-400">
              console.anthropic.com에서 발급받은 API 키를 입력하세요. 이 브라우저가 아닌 서버(DB)에 저장됩니다.
            </p>
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
                {pending ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
