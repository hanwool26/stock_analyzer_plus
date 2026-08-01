"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function addHolding(formData: FormData) {
  const ticker = String(formData.get("ticker") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const region = String(formData.get("region") ?? "KR");
  const currency = String(formData.get("currency") ?? "KRW");
  const quantity = Number(formData.get("quantity"));
  const price = Number(formData.get("price"));

  if (!ticker || !name || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
    throw new Error("입력값을 확인해주세요.");
  }

  await prisma.holding.create({
    data: {
      ticker,
      name,
      region,
      currency,
      quantity,
      avgPrice: price,
      transactions: {
        create: {
          type: "BUY",
          quantity,
          price,
          executedAt: new Date(),
        },
      },
    },
  });

  revalidatePath("/portfolio");
}

export async function addTransaction(formData: FormData) {
  const holdingId = String(formData.get("holdingId") ?? "");
  const type = String(formData.get("type") ?? "BUY") as "BUY" | "SELL";
  const quantity = Number(formData.get("quantity"));
  const price = Number(formData.get("price"));

  if (!holdingId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
    throw new Error("입력값을 확인해주세요.");
  }

  const holding = await prisma.holding.findUniqueOrThrow({ where: { id: holdingId } });

  let newQuantity: number;
  let newAvgPrice: number;

  if (type === "BUY") {
    newQuantity = holding.quantity + quantity;
    newAvgPrice = (holding.quantity * holding.avgPrice + quantity * price) / newQuantity;
  } else {
    newQuantity = Math.max(0, holding.quantity - quantity);
    newAvgPrice = holding.avgPrice; // 매도 시 평단가는 유지
  }

  await prisma.$transaction([
    prisma.transaction.create({
      data: { holdingId, type, quantity, price, executedAt: new Date() },
    }),
    prisma.holding.update({
      where: { id: holdingId },
      data: { quantity: newQuantity, avgPrice: newAvgPrice },
    }),
  ]);

  revalidatePath("/portfolio");
}

export async function deleteHolding(holdingId: string) {
  if (!holdingId) return;
  await prisma.holding.delete({ where: { id: holdingId } });
  revalidatePath("/portfolio");
}

// 실시간 시세 연동 전까지는 평단가를 현재가로 근사해 스냅샷을 기록한다.
export async function ensureTodaySnapshot() {
  const holdings = await prisma.holding.findMany();

  const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.avgPrice, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.quantity * h.avgPrice, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.portfolioSnapshot.upsert({
    where: { date: today },
    update: { totalValue, totalCost },
    create: { date: today, totalValue, totalCost },
  });
}
