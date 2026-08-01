import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getApiKeyStatus } from "@/lib/settings";
import CoachingConversationList from "@/components/CoachingConversationList";
import ChatThread from "@/components/ChatThread";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import ApiKeySettingsDialog from "@/components/ApiKeySettingsDialog";
import { deleteConversation } from "../actions";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  const [conversation, conversations, apiKeyStatus] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, _count: { select: { messages: true } } },
    }),
    getApiKeyStatus(),
  ]);

  if (!conversation) notFound();

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">AI 코칭</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            가족의 가계 자산 데이터를 바탕으로 AI에게 질문해보세요.
          </p>
        </div>
        <ApiKeySettingsDialog status={apiKeyStatus} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 mt-6">
        <CoachingConversationList
          conversations={conversations.map((c) => ({
            id: c.id,
            title: c.title,
            updatedAt: c.updatedAt.toISOString(),
            messageCount: c._count.messages,
          }))}
        />
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">{conversation.title ?? "새 대화"}</h2>
            <ConfirmDeleteButton
              action={deleteConversation.bind(null, conversation.id)}
              label="대화 삭제"
              confirmMessage="이 대화를 삭제할까요? 되돌릴 수 없습니다."
            />
          </div>
          <ChatThread
            conversationId={conversation.id}
            messages={conversation.messages.map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              createdAt: m.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
