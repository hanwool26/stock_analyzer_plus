"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface ConversationListItem {
  id: string;
  title: string | null;
  updatedAt: string;
  messageCount: number;
}

export default function CoachingConversationList({
  conversations,
}: {
  conversations: ConversationListItem[];
}) {
  const pathname = usePathname();

  return (
    <aside className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-fit">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">대화 목록</h3>
      </div>
      {conversations.length === 0 ? (
        <p className="px-4 py-6 text-xs text-slate-400">대화 내역이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
          {conversations.map((c) => {
            const active = pathname === `/coaching/${c.id}`;
            return (
              <li key={c.id}>
                <Link
                  href={`/coaching/${c.id}`}
                  className={
                    "block px-4 py-2.5 text-sm transition-colors " +
                    (active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50")
                  }
                >
                  <p className="truncate font-medium">{c.title ?? "새 대화"}</p>
                  <p className={"text-xs mt-0.5 " + (active ? "text-slate-300" : "text-slate-400")}>
                    {new Date(c.updatedAt).toLocaleDateString("ko-KR")} · {c.messageCount}개 메시지
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
