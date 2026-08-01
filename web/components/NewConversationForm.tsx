"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createConversation } from "@/app/coaching/actions";

export default function NewConversationForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const { conversationId } = await createConversation(message);
        setMessage("");
        router.push(`/coaching/${conversationId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "대화를 시작하지 못했습니다.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">새 질문하기</h3>
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="예: 우리 가족 순자산 중 부동산 비중이 어느 정도야?"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || !message.trim()}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? "질문 전송 중..." : "질문하기"}
          </button>
        </div>
      </form>
    </div>
  );
}
