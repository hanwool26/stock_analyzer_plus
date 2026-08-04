"use server";

import { verifyPin } from "@/lib/pin";

export async function checkPrivacyPin(pin: string): Promise<boolean> {
  return verifyPin(pin);
}
