-- CreateTable: eval_item_versions
CREATE TABLE "eval_item_versions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_item_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: eval_item_version_details
CREATE TABLE "eval_item_version_details" (
    "id" SERIAL NOT NULL,
    "version_id" INTEGER NOT NULL,
    "evaluation_item_id" INTEGER NOT NULL,
    "target_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "no" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "eval_criteria" TEXT,

    CONSTRAINT "eval_item_version_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "eval_item_version_details_version_id_evaluation_item_id_key" ON "eval_item_version_details"("version_id", "evaluation_item_id");

-- AddForeignKey
ALTER TABLE "eval_item_version_details" ADD CONSTRAINT "eval_item_version_details_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "eval_item_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_item_version_details" ADD CONSTRAINT "eval_item_version_details_evaluation_item_id_fkey" FOREIGN KEY ("evaluation_item_id") REFERENCES "evaluation_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_item_version_details" ADD CONSTRAINT "eval_item_version_details_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_item_version_details" ADD CONSTRAINT "eval_item_version_details_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: Create v1 from current evaluation_items for each fiscal year that has fiscal_year_items
-- Step 1: Create one version per distinct set of fiscal_year_items
-- For simplicity, create one shared "初期バージョン" from current evaluation_items
INSERT INTO "eval_item_versions" ("name") VALUES ('初期バージョン');

-- Step 2: Snapshot current evaluation_items into version details
INSERT INTO "eval_item_version_details" ("version_id", "evaluation_item_id", "target_id", "category_id", "no", "name", "description", "eval_criteria")
SELECT
    (SELECT "id" FROM "eval_item_versions" WHERE "name" = '初期バージョン' LIMIT 1),
    ei."id",
    ei."target_id",
    ei."category_id",
    ei."no",
    ei."name",
    ei."description",
    ei."eval_criteria"
FROM "evaluation_items" ei
WHERE ei."id" IN (SELECT DISTINCT "evaluation_item_id" FROM "fiscal_year_items");

-- Step 3: Add eval_item_version_id column to fiscal_years
ALTER TABLE "fiscal_years" ADD COLUMN "eval_item_version_id" INTEGER;

-- Step 4: Assign the initial version to all fiscal years that have fiscal_year_items
UPDATE "fiscal_years"
SET "eval_item_version_id" = (SELECT "id" FROM "eval_item_versions" WHERE "name" = '初期バージョン' LIMIT 1)
WHERE "year" IN (SELECT DISTINCT "fiscal_year" FROM "fiscal_year_items");

-- AddForeignKey
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_eval_item_version_id_fkey" FOREIGN KEY ("eval_item_version_id") REFERENCES "eval_item_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Migrate evaluations.eval_item_id -> eval_item_version_detail_id
ALTER TABLE "evaluations" ADD COLUMN "eval_item_version_detail_id" INTEGER;

UPDATE "evaluations" e
SET "eval_item_version_detail_id" = vd."id"
FROM "eval_item_version_details" vd
JOIN "fiscal_years" fy ON fy."eval_item_version_id" = vd."version_id"
WHERE e."fiscal_year" = fy."year"
  AND e."eval_item_id" = vd."evaluation_item_id";

-- Drop old constraint and column
DROP INDEX "evaluations_fiscal_year_evaluatee_id_eval_item_id_key";
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_eval_item_id_fkey";
ALTER TABLE "evaluations" DROP COLUMN "eval_item_id";
ALTER TABLE "evaluations" ALTER COLUMN "eval_item_version_detail_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_fiscal_year_evaluatee_id_eval_item_version_deta_key" ON "evaluations"("fiscal_year", "evaluatee_id", "eval_item_version_detail_id");

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_eval_item_version_detail_id_fkey" FOREIGN KEY ("eval_item_version_detail_id") REFERENCES "eval_item_version_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Drop fiscal_year_items
ALTER TABLE "fiscal_year_items" DROP CONSTRAINT "fiscal_year_items_evaluation_item_id_fkey";
ALTER TABLE "fiscal_year_items" DROP CONSTRAINT "fiscal_year_items_fiscal_year_fkey";
DROP TABLE "fiscal_year_items";
