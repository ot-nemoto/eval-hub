-- AlterTable
ALTER TABLE "evaluations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "fiscal_years" ADD COLUMN     "is_locked" BOOLEAN NOT NULL DEFAULT false;
