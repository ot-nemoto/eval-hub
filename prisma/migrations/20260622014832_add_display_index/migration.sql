-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "index" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "eval_item_version_details" ADD COLUMN     "category_index" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "index" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "target_index" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "evaluation_items" ADD COLUMN     "index" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "targets" ADD COLUMN     "index" INTEGER NOT NULL DEFAULT 0;

-- Backfill: targets の index を no 昇順で採番
UPDATE "targets" SET "index" = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "no") AS rn FROM "targets"
) sub WHERE "targets".id = sub.id;

-- Backfill: categories の index を target_id 内の no 昇順で採番
UPDATE "categories" SET "index" = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "target_id" ORDER BY "no") AS rn FROM "categories"
) sub WHERE "categories".id = sub.id;

-- Backfill: evaluation_items の index を category_id 内の no 昇順で採番
UPDATE "evaluation_items" SET "index" = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "category_id" ORDER BY "no") AS rn FROM "evaluation_items"
) sub WHERE "evaluation_items".id = sub.id;

-- Backfill: eval_item_version_details の index を version_id 内の category_no, no 昇順で採番
UPDATE "eval_item_version_details" SET
  "index" = sub.item_rn,
  "target_index" = sub.target_rn,
  "category_index" = sub.cat_rn
FROM (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY "version_id", "category_id" ORDER BY "no") AS item_rn,
    DENSE_RANK() OVER (PARTITION BY "version_id" ORDER BY "target_no") AS target_rn,
    DENSE_RANK() OVER (PARTITION BY "version_id", "target_id" ORDER BY "category_no") AS cat_rn
  FROM "eval_item_version_details"
) sub WHERE "eval_item_version_details".id = sub.id;
