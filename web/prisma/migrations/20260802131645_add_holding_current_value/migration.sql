-- AlterTable
ALTER TABLE "Holding" ADD COLUMN     "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill: 재수입 전까지는 매입원가를 평가금액 근사치로 채워둔다.
UPDATE "Holding" SET "currentValue" = "quantity" * "avgPrice";
