import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { deleteFamilyMember } from "../actions";
import AssetsSubNav from "@/components/AssetsSubNav";
import SnapshotFormDialog from "@/components/SnapshotFormDialog";
import MemberSnapshotSection from "@/components/MemberSnapshotSection";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";

export const dynamic = "force-dynamic";

export default async function MemberAssetsPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;

  const [member, members] = await Promise.all([
    prisma.familyMember.findUnique({
      where: { id: memberId },
      include: { snapshots: { orderBy: { date: "desc" }, include: { items: true } } },
    }),
    prisma.familyMember.findMany({ orderBy: { order: "asc" } }),
  ]);

  if (!member) notFound();

  // snapshots는 date desc로 정렬되어 있으므로 첫 번째가 최신 스냅샷입니다.
  const latestSnapshot = member.snapshots[0];
  const allItems = member.snapshots.flatMap((s) => s.items);
  const assetCategories = Array.from(
    new Set(allItems.filter((i) => i.type === "ASSET").map((i) => i.category))
  );
  const liabilityCategories = Array.from(
    new Set(allItems.filter((i) => i.type === "LIABILITY").map((i) => i.category))
  );

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-slate-900">가계자산</h1>
        <p className="text-sm text-slate-500 mt-0.5">구성원별 자산/부채/순자산 현황과 추이를 관리합니다.</p>
      </div>

      <AssetsSubNav members={members.map((m) => ({ id: m.id, name: m.name }))} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-lg font-bold text-slate-900">{member.name}</h2>
        <div className="flex items-center gap-3">
          <ConfirmDeleteButton
            action={deleteFamilyMember.bind(null, member.id)}
            label="구성원 삭제"
            confirmMessage={`${member.name} 구성원을 삭제할까요? 등록된 모든 자산 스냅샷이 함께 삭제되며 되돌릴 수 없습니다.`}
          />
          <SnapshotFormDialog
            key={latestSnapshot?.id ?? "new"}
            memberId={member.id}
            assetCategories={assetCategories}
            liabilityCategories={liabilityCategories}
            template={
              latestSnapshot
                ? {
                    memo: latestSnapshot.memo,
                    items: latestSnapshot.items.map((i) => ({
                      type: i.type as "ASSET" | "LIABILITY",
                      category: i.category,
                      name: i.name,
                      amount: i.amount,
                      note: i.note,
                    })),
                  }
                : undefined
            }
          />
        </div>
      </div>

      <MemberSnapshotSection
        memberId={member.id}
        memberName={member.name}
        snapshots={member.snapshots}
        assetCategories={assetCategories}
        liabilityCategories={liabilityCategories}
      />
    </div>
  );
}
