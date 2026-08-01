import { prisma } from "@/lib/db";
import { getApiKeyStatus } from "@/lib/settings";
import CoachingConversationList from "@/components/CoachingConversationList";
import NewConversationForm from "@/components/NewConversationForm";
import ApiKeySettingsDialog from "@/components/ApiKeySettingsDialog";

export const dynamic = "force-dynamic";

export default async function CoachingPage() {
  const [conversations, apiKeyStatus] = await Promise.all([
    prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, _count: { select: { messages: true } } },
    }),
    getApiKeyStatus(),
  ]);

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
          <NewConversationForm />
          {conversations.length === 0 && (
            <p className="mt-6 text-sm text-slate-400">아직 대화가 없습니다. 질문을 입력해 시작해보세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
