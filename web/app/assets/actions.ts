"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { FinanceItemInput } from "@/lib/finance";
import { parseDateOnly } from "@/lib/date";

const DEFAULT_MEMBERS = ["이한울", "양은진"];

export async function ensureDefaultMembers() {
  const count = await prisma.familyMember.count();
  if (count > 0) return;

  await prisma.$transaction(
    DEFAULT_MEMBERS.map((name, i) =>
      prisma.familyMember.create({ data: { name, order: i } })
    )
  );
}

export async function addFamilyMember(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("이름을 입력해주세요.");

  const count = await prisma.familyMember.count();
  await prisma.familyMember.create({ data: { name: trimmed, order: count } });

  revalidatePath("/assets");
}

export async function deleteFamilyMember(memberId: string) {
  await prisma.familyMember.delete({ where: { id: memberId } });
  revalidatePath("/assets");
  redirect("/assets");
}

export async function saveSnapshot(input: {
  memberId: string;
  date: string; // "YYYY-MM-DD"
  memo?: string;
  items: FinanceItemInput[];
}) {
  const date = parseDateOnly(input.date);
  if (Number.isNaN(date.getTime())) throw new Error("날짜를 확인해주세요.");
  if (input.items.length === 0) throw new Error("항목을 1개 이상 입력해주세요.");
  for (const item of input.items) {
    if (!item.category.trim() || !item.name.trim() || !Number.isFinite(item.amount)) {
      throw new Error("항목의 분류/이름/금액을 확인해주세요.");
    }
  }

  const existing = await prisma.financeSnapshot.findUnique({
    where: { memberId_date: { memberId: input.memberId, date } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.financeItem.deleteMany({ where: { snapshotId: existing.id } }),
      prisma.financeSnapshot.update({
        where: { id: existing.id },
        data: {
          memo: input.memo,
          items: {
            create: input.items.map((item, i) => ({ ...item, order: i })),
          },
        },
      }),
    ]);
  } else {
    await prisma.financeSnapshot.create({
      data: {
        memberId: input.memberId,
        date,
        memo: input.memo,
        items: {
          create: input.items.map((item, i) => ({ ...item, order: i })),
        },
      },
    });
  }

  revalidatePath("/assets");
}

export async function deleteSnapshot(snapshotId: string) {
  await prisma.financeSnapshot.delete({ where: { id: snapshotId } });
  revalidatePath("/assets");
}
