-- Step 1: Add columns as nullable
ALTER TABLE "eval_item_version_details" ADD COLUMN "target_no" INTEGER;
ALTER TABLE "eval_item_version_details" ADD COLUMN "target_name" VARCHAR(255);
ALTER TABLE "eval_item_version_details" ADD COLUMN "category_no" INTEGER;
ALTER TABLE "eval_item_version_details" ADD COLUMN "category_name" VARCHAR(255);

-- Step 2: Backfill from current targets/categories
UPDATE "eval_item_version_details" d
SET
  "target_no" = t."no",
  "target_name" = t."name"
FROM "targets" t
WHERE d."target_id" = t."id";

UPDATE "eval_item_version_details" d
SET
  "category_no" = c."no",
  "category_name" = c."name"
FROM "categories" c
WHERE d."category_id" = c."id";

-- Step 3: Set NOT NULL constraints
ALTER TABLE "eval_item_version_details" ALTER COLUMN "target_no" SET NOT NULL;
ALTER TABLE "eval_item_version_details" ALTER COLUMN "target_name" SET NOT NULL;
ALTER TABLE "eval_item_version_details" ALTER COLUMN "category_no" SET NOT NULL;
ALTER TABLE "eval_item_version_details" ALTER COLUMN "category_name" SET NOT NULL;
