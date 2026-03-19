-- CreateTable
CREATE TABLE IF NOT EXISTS "fiscal_years" (
    "year" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "fiscal_year_items" (
    "fiscal_year" INTEGER NOT NULL,
    "evaluation_item_uid" VARCHAR(20) NOT NULL,

    CONSTRAINT "fiscal_year_items_pkey" PRIMARY KEY ("fiscal_year","evaluation_item_uid")
);

-- Seed existing fiscal years before adding FK constraints
INSERT INTO "fiscal_years" ("year", "name", "start_date", "end_date", "is_current") VALUES
  (2025, '2025年度', '2025-04-01', '2026-03-31', false),
  (2026, '2026年度', '2026-04-01', '2027-03-31', true),
  (2027, '2027年度', '2027-04-01', '2028-03-31', false)
ON CONFLICT ("year") DO NOTHING;

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fiscal_year_items_fiscal_year_fkey') THEN
    ALTER TABLE "fiscal_year_items" ADD CONSTRAINT "fiscal_year_items_fiscal_year_fkey" FOREIGN KEY ("fiscal_year") REFERENCES "fiscal_years"("year") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fiscal_year_items_evaluation_item_uid_fkey') THEN
    ALTER TABLE "fiscal_year_items" ADD CONSTRAINT "fiscal_year_items_evaluation_item_uid_fkey" FOREIGN KEY ("evaluation_item_uid") REFERENCES "evaluation_items"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_settings_fiscal_year_fkey') THEN
    ALTER TABLE "evaluation_settings" ADD CONSTRAINT "evaluation_settings_fiscal_year_fkey" FOREIGN KEY ("fiscal_year") REFERENCES "fiscal_years"("year") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_assignments_fiscal_year_fkey') THEN
    ALTER TABLE "evaluation_assignments" ADD CONSTRAINT "evaluation_assignments_fiscal_year_fkey" FOREIGN KEY ("fiscal_year") REFERENCES "fiscal_years"("year") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluations_fiscal_year_fkey') THEN
    ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_fiscal_year_fkey" FOREIGN KEY ("fiscal_year") REFERENCES "fiscal_years"("year") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
