import { prisma } from "@/lib/db";

const ANTHROPIC_API_KEY_SETTING = "anthropic_api_key";

export async function getStoredApiKey(): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key: ANTHROPIC_API_KEY_SETTING } });
  return setting?.value ?? null;
}

export async function saveStoredApiKey(apiKey: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: ANTHROPIC_API_KEY_SETTING },
    create: { key: ANTHROPIC_API_KEY_SETTING, value: apiKey },
    update: { value: apiKey },
  });
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 10) return "••••";
  return `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;
}

export interface ApiKeyStatus {
  configured: boolean;
  source: "db" | "env" | null;
  masked: string | null;
}

export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  const stored = await getStoredApiKey();
  if (stored) {
    return { configured: true, source: "db", masked: maskApiKey(stored) };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { configured: true, source: "env", masked: null };
  }
  return { configured: false, source: null, masked: null };
}
