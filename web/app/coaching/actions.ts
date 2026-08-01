"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { askClaude, buildHouseholdContext, buildSystemPrompt, deriveConversationTitle } from "@/lib/coaching";
import { saveStoredApiKey } from "@/lib/settings";

export async function saveApiKey(apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error("API 키를 입력해주세요.");

  await saveStoredApiKey(trimmed);
  revalidatePath("/coaching");
}

export async function createConversation(message: string): Promise<{ conversationId: string }> {
  const trimmed = message.trim();
  if (!trimmed) throw new Error("질문을 입력해주세요.");

  const context = await buildHouseholdContext();
  const systemPrompt = buildSystemPrompt(context);
  const reply = await askClaude(systemPrompt, [{ role: "user", content: trimmed }]);

  const conversation = await prisma.conversation.create({
    data: {
      title: deriveConversationTitle(trimmed),
      messages: {
        create: [
          { role: "user", content: trimmed },
          { role: "assistant", content: reply },
        ],
      },
    },
  });

  revalidatePath("/coaching");
  return { conversationId: conversation.id };
}

export async function sendMessage(conversationId: string, message: string): Promise<void> {
  const trimmed = message.trim();
  if (!trimmed) throw new Error("메시지를 입력해주세요.");

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) throw new Error("대화를 찾을 수 없습니다.");

  const context = await buildHouseholdContext();
  const systemPrompt = buildSystemPrompt(context);
  const history = [
    ...conversation.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: trimmed },
  ];
  const reply = await askClaude(systemPrompt, history);

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      messages: {
        create: [
          { role: "user", content: trimmed },
          { role: "assistant", content: reply },
        ],
      },
    },
  });

  revalidatePath(`/coaching/${conversationId}`);
  revalidatePath("/coaching");
}

export async function deleteConversation(conversationId: string) {
  await prisma.conversation.delete({ where: { id: conversationId } });
  revalidatePath("/coaching");
  redirect("/coaching");
}
