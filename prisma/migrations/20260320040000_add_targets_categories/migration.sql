-- CreateTable: targets
CREATE TABLE "targets" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_no" INTEGER NOT NULL,
    CONSTRAINT "targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: categories
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "target_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_no" INTEGER NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: categories -> targets
ALTER TABLE "categories" ADD CONSTRAINT "categories_target_id_fkey"
    FOREIGN KEY ("target_id") REFERENCES "targets"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate data: insert distinct targets from evaluation_items
INSERT INTO "targets" ("name", "sort_no")
SELECT target, MIN(COALESCE(target_no, 0))
FROM "evaluation_items"
GROUP BY target
ORDER BY MIN(COALESCE(target_no, 0));

-- Migrate data: insert distinct categories from evaluation_items
INSERT INTO "categories" ("target_id", "name", "sort_no")
SELECT t.id, ei.category, MIN(COALESCE(ei.category_no, 0))
FROM "evaluation_items" ei
JOIN "targets" t ON t.name = ei.target
GROUP BY t.id, ei.category
ORDER BY t.id, MIN(COALESCE(ei.category_no, 0));

-- Add nullable FK columns to evaluation_items
ALTER TABLE "evaluation_items" ADD COLUMN "target_id" INTEGER;
ALTER TABLE "evaluation_items" ADD COLUMN "category_id" INTEGER;

-- Populate target_id
UPDATE "evaluation_items" ei
SET target_id = t.id
FROM "targets" t
WHERE t.name = ei.target;

-- Populate category_id
UPDATE "evaluation_items" ei
SET category_id = c.id
FROM "categories" c
JOIN "targets" t ON t.id = c.target_id
WHERE c.name = ei.category AND t.name = ei.target;

-- Set NOT NULL
ALTER TABLE "evaluation_items" ALTER COLUMN "target_id" SET NOT NULL;
ALTER TABLE "evaluation_items" ALTER COLUMN "category_id" SET NOT NULL;

-- AddForeignKey: evaluation_items -> targets
ALTER TABLE "evaluation_items" ADD CONSTRAINT "evaluation_items_target_id_fkey"
    FOREIGN KEY ("target_id") REFERENCES "targets"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: evaluation_items -> categories
ALTER TABLE "evaluation_items" ADD CONSTRAINT "evaluation_items_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old columns
ALTER TABLE "evaluation_items" DROP COLUMN "target";
ALTER TABLE "evaluation_items" DROP COLUMN "target_no";
ALTER TABLE "evaluation_items" DROP COLUMN "category";
ALTER TABLE "evaluation_items" DROP COLUMN "category_no";
