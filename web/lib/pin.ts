import { timingSafeEqual } from "crypto";

export function isPinConfigured(): boolean {
  return Boolean(process.env.BASIC_AUTH_PASSWORD);
}

export function verifyPin(pin: string): boolean {
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!password) return true;

  const a = Buffer.from(pin);
  const b = Buffer.from(password);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
