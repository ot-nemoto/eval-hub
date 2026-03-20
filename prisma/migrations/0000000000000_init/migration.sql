-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "Score" AS ENUM ('none', 'ka', 'ryo', 'yu');

-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "clerk_id" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "division" VARCHAR(100),
    "joined_at" DATE,
    "role" "UserRole" NOT NULL,
    "wants_president_meeting" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: fiscal_years
CREATE TABLE "fiscal_years" (
    "year" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("year")
);

-- CreateTable: evaluation_settings
CREATE TABLE "evaluation_settings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "self_evaluation_enabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "evaluation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: evaluation_assignments
CREATE TABLE "evaluation_assignments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "fiscal_year" INTEGER NOT NULL,
    "evaluatee_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    CONSTRAINT "evaluation_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: targets
CREATE TABLE "targets" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "no" INTEGER NOT NULL,
    CONSTRAINT "targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: categories
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "target_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "no" INTEGER NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: evaluation_items
CREATE TABLE "evaluation_items" (
    "id" SERIAL NOT NULL,
    "target_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "no" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "eval_criteria" TEXT,
    CONSTRAINT "evaluation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: fiscal_year_items
CREATE TABLE "fiscal_year_items" (
    "fiscal_year" INTEGER NOT NULL,
    "evaluation_item_id" INTEGER NOT NULL,
    CONSTRAINT "fiscal_year_items_pkey" PRIMARY KEY ("fiscal_year", "evaluation_item_id")
);

-- CreateTable: evaluations
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "fiscal_year" INTEGER NOT NULL,
    "evaluatee_id" TEXT NOT NULL,
    "eval_item_id" INTEGER NOT NULL,
    "self_score" "Score",
    "self_reason" TEXT,
    "manager_score" "Score",
    "manager_reason" TEXT,
    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: users
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex: evaluation_settings
CREATE UNIQUE INDEX "evaluation_settings_user_id_fiscal_year_key" ON "evaluation_settings"("user_id", "fiscal_year");

-- CreateIndex: evaluation_assignments
CREATE UNIQUE INDEX "evaluation_assignments_fiscal_year_evaluatee_id_evaluator_id_key" ON "evaluation_assignments"("fiscal_year", "evaluatee_id", "evaluator_id");

-- CreateIndex: targets
CREATE UNIQUE INDEX "targets_no_key" ON "targets"("no");

-- CreateIndex: categories
CREATE UNIQUE INDEX "categories_target_id_no_key" ON "categories"("target_id", "no");

-- CreateIndex: evaluation_items
CREATE UNIQUE INDEX "evaluation_items_category_id_no_key" ON "evaluation_items"("category_id", "no");

-- CreateIndex: evaluations
CREATE UNIQUE INDEX "evaluations_fiscal_year_evaluatee_id_eval_item_id_key" ON "evaluations"("fiscal_year", "evaluatee_id", "eval_item_id");

-- CreateIndex: is_current partial unique (at most 1 true per fiscal_years)
CREATE UNIQUE INDEX "fiscal_years_is_current_true_key" ON "fiscal_years"("is_current") WHERE "is_current" = true;

-- AddForeignKey
ALTER TABLE "evaluation_settings" ADD CONSTRAINT "evaluation_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_settings" ADD CONSTRAINT "evaluation_settings_fiscal_year_fkey" FOREIGN KEY ("fiscal_year") REFERENCES "fiscal_years"("year") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_assignments" ADD CONSTRAINT "evaluation_assignments_evaluatee_id_fkey" FOREIGN KEY ("evaluatee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_assignments" ADD CONSTRAINT "evaluation_assignments_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_assignments" ADD CONSTRAINT "evaluation_assignments_fiscal_year_fkey" FOREIGN KEY ("fiscal_year") REFERENCES "fiscal_years"("year") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "categories" ADD CONSTRAINT "categories_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_items" ADD CONSTRAINT "evaluation_items_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_items" ADD CONSTRAINT "evaluation_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fiscal_year_items" ADD CONSTRAINT "fiscal_year_items_fiscal_year_fkey" FOREIGN KEY ("fiscal_year") REFERENCES "fiscal_years"("year") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_year_items" ADD CONSTRAINT "fiscal_year_items_evaluation_item_id_fkey" FOREIGN KEY ("evaluation_item_id") REFERENCES "evaluation_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluatee_id_fkey" FOREIGN KEY ("evaluatee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_eval_item_id_fkey" FOREIGN KEY ("eval_item_id") REFERENCES "evaluation_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_fiscal_year_fkey" FOREIGN KEY ("fiscal_year") REFERENCES "fiscal_years"("year") ON DELETE RESTRICT ON UPDATE CASCADE;
