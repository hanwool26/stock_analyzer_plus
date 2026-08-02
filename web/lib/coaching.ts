import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { computeTotals, groupByCategory, type FinanceItemLike } from "@/lib/finance";
import { formatKrw } from "@/lib/format";
import { formatDateOnlyKorean } from "@/lib/date";
import { getStoredApiKey } from "@/lib/settings";
import { toKrw } from "@/lib/fx";

export const CLAUDE_MODEL = process.env.ANTHROPIC_COACHING_MODEL || "claude-sonnet-5";

export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

function renderGroups(groups: ReturnType<typeof groupByCategory<FinanceItemLike>>): string {
  return groups
    .map(
      (g) =>
        `  - ${g.category} (소계 ${formatKrw(g.subtotal)}): ` +
        g.items.map((i) => `${i.name} ${formatKrw(i.amount)}${i.note ? ` (${i.note})` : ""}`).join(", ")
    )
    .join("\n");
}

/** 가족 구성원별 "최신 스냅샷"만을 근거로 LLM용 컨텍스트 텍스트를 만든다.
 *  전체 히스토리를 포함하지 않는 이유: 프롬프트 크기 폭증 방지. */
export async function buildHouseholdContext(): Promise<string> {
  const members = await prisma.familyMember.findMany({
    orderBy: { order: "asc" },
    include: {
      snapshots: {
        orderBy: { date: "desc" },
        take: 1,
        include: { items: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (members.length === 0) {
    return "등록된 가족 구성원이나 자산 데이터가 없습니다.";
  }

  const sections = members.map((member) => {
    const latest = member.snapshots[0];
    if (!latest) return `## ${member.name}\n등록된 자산 스냅샷이 없습니다.`;

    const totals = computeTotals(latest.items);
    const assetGroups = groupByCategory(latest.items, "ASSET");
    const liabilityGroups = groupByCategory(latest.items, "LIABILITY");

    return [
      `## ${member.name} (기준일: ${formatDateOnlyKorean(latest.date)})`,
      `- 총자산: ${formatKrw(totals.assetTotal)}`,
      `- 총부채: ${formatKrw(totals.liabilityTotal)}`,
      `- 순자산: ${formatKrw(totals.netWorth)}`,
      assetGroups.length ? `- 자산 상세:\n${renderGroups(assetGroups)}` : null,
      liabilityGroups.length ? `- 부채 상세:\n${renderGroups(liabilityGroups)}` : null,
      latest.memo ? `- 메모: ${latest.memo}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  const grand = members.reduce(
    (acc, m) => {
      const latest = m.snapshots[0];
      if (!latest) return acc;
      const t = computeTotals(latest.items);
      return {
        assetTotal: acc.assetTotal + t.assetTotal,
        liabilityTotal: acc.liabilityTotal + t.liabilityTotal,
        netWorth: acc.netWorth + t.netWorth,
      };
    },
    { assetTotal: 0, liabilityTotal: 0, netWorth: 0 }
  );

  return [
    "# 가계 자산 현황 (구성원별 최신 스냅샷 기준)",
    ...sections,
    "## 가구 합계",
    `- 총자산: ${formatKrw(grand.assetTotal)}`,
    `- 총부채: ${formatKrw(grand.liabilityTotal)}`,
    `- 순자산: ${formatKrw(grand.netWorth)}`,
  ].join("\n\n");
}

/** 보유 종목(포트폴리오) 현황을 LLM용 컨텍스트 텍스트로 만든다.
 *  Holding은 가족 구성원에 종속되지 않는 가구 공용 포트폴리오이므로 가계자산과 별도 섹션으로 제공한다. */
export async function buildPortfolioContext(): Promise<string> {
  const holdings = await prisma.holding.findMany({ orderBy: { createdAt: "asc" } });

  if (holdings.length === 0) {
    return "등록된 보유 종목이 없습니다.";
  }

  const rows = holdings.map((h) => {
    const valueKrw = toKrw(h.currentValue, h.currency);
    const costKrw = toKrw(h.quantity * h.avgPrice, h.currency);
    const returnPct = costKrw > 0 ? ((valueKrw - costKrw) / costKrw) * 100 : 0;
    return { ...h, valueKrw, costKrw, returnPct };
  });

  const totalValueKrw = rows.reduce((sum, h) => sum + h.valueKrw, 0);
  const totalCostKrw = rows.reduce((sum, h) => sum + h.costKrw, 0);
  const totalReturnPct = totalCostKrw > 0 ? ((totalValueKrw - totalCostKrw) / totalCostKrw) * 100 : 0;

  const lines = rows.map(
    (h) =>
      `  - ${h.name} (${h.ticker}, ${h.region}): 수량 ${h.quantity}, 평단가 ${h.avgPrice.toLocaleString("ko-KR")} ${h.currency}, ` +
      `평가금액 ${formatKrw(h.valueKrw)}, 수익률 ${h.returnPct.toFixed(2)}%`
  );

  return [
    "# 보유 종목 현황 (포트폴리오)",
    ...lines,
    "## 포트폴리오 합계",
    `- 총 평가금액: ${formatKrw(totalValueKrw)}`,
    `- 총 매입금액: ${formatKrw(totalCostKrw)}`,
    `- 총 수익률: ${totalReturnPct.toFixed(2)}%`,
  ].join("\n");
}

export function buildSystemPrompt(householdContext: string, portfolioContext: string): string {
  return [
    "당신은 사용자 가족의 가계 자산 및 보유 종목(포트폴리오) 데이터를 바탕으로 답변하는 AI 재무 코치입니다.",
    "아래는 가족 구성원별 최신 자산/부채 스냅샷 데이터와 보유 종목 현황입니다. 반드시 이 데이터를 근거로만 답변하세요.",
    "데이터에 없는 내용은 추측하지 말고, 정보가 부족하면 그렇다고 안내하세요.",
    "답변은 한국어로, 간결하고 실질적으로 작성하세요.",
    "이 답변은 투자 권유가 아니며 참고용 정보임을 전제로 답변하세요.",
    "",
    householdContext,
    "",
    portfolioContext,
  ].join("\n");
}

export function deriveConversationTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim().replace(/\s+/g, " ");
  if (!trimmed) return "새 대화";
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
}

async function getClient(): Promise<Anthropic> {
  const apiKey = (await getStoredApiKey()) || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("API 키가 설정되어 있지 않습니다. AI 코칭 페이지에서 API 키를 등록해주세요.");
  }
  return new Anthropic({ apiKey });
}

export async function askClaude(systemPrompt: string, history: ChatMessage[]): Promise<string> {
  const client = await getClient();

  let response;
  try {
    response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      messages: history,
    });
  } catch (err) {
    console.error("[coaching] Claude API 호출 실패:", err);
    throw new Error("AI 응답을 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return textBlock?.text ?? "";
}
