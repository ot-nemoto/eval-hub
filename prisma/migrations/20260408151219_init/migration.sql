-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "Score" AS ENUM ('none', 'ka', 'ryo', 'yu');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_id" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "division" VARCHAR(100),
    "joined_at" DATE,
    "role" "UserRole" NOT NULL,
    "wants_president_meeting" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_years" (
    "year" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "fiscal_year_items" (
    "fiscal_year" INTEGER NOT NULL,
    "evaluation_item_id" INTEGER NOT NULL,

    CONSTRAINT "fiscal_year_items_pkey" PRIMARY KEY ("fiscal_year","evaluation_item_id")
);

-- CreateTable
CREATE TABLE "evaluation_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "self_evaluation_enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "evaluation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_assignments" (
    "id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "evaluatee_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,

    CONSTRAINT "evaluation_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "targets" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "no" INTEGER NOT NULL,

    CONSTRAINT "targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "target_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "no" INTEGER NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "evaluatee_id" TEXT NOT NULL,
    "eval_item_id" INTEGER NOT NULL,
    "self_score" "Score",
    "self_reason" TEXT,
    "manager_score" "Score",
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_comments" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "score" "Score",
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_settings_user_id_fiscal_year_key" ON "evaluation_settings"("user_id", "fiscal_year");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_assignments_fiscal_year_evaluatee_id_evaluator_i_key" ON "evaluation_assignments"("fiscal_year", "evaluatee_id", "evaluator_id");

-- CreateIndex
CREATE UNIQUE INDEX "targets_no_key" ON "targets"("no");

-- CreateIndex
CREATE UNIQUE INDEX "categories_target_id_no_key" ON "categories"("target_id", "no");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_items_category_id_no_key" ON "evaluation_items"("category_id", "no");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_fiscal_year_evaluatee_id_eval_item_id_key" ON "evaluations"("fiscal_year", "evaluatee_id", "eval_item_id");

-- AddForeignKey
ALTER TABLE "fiscal_year_items" ADD CONSTRAINT "fiscal_year_items_fiscal_year_fkey" FOREIGN KEY ("fiscal_year") REFERENCES "fiscal_years"("year") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_year_items" ADD CONSTRAINT "fiscal_year_items_evaluation_item_id_fkey" FOREIGN KEY ("evaluation_item_id") REFERENCES "evaluation_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_settings" ADD CONSTRAINT "evaluation_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_settings" ADD CONSTRAINT "evaluation_settings_fiscal_year_fkey" FOREIGN KEY ("fiscal_year") REFERENCES "fiscal_years"("year") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_assignments" ADD CONSTRAINT "evaluation_assignments_evaluatee_id_fkey" FOREIGN KEY ("evaluatee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_assignments" ADD CONSTRAINT "evaluation_assignments_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_assignments" ADD CONSTRAINT "evaluation_assignments_fiscal_year_fkey" FOREIGN KEY ("fiscal_year") REFERENCES "fiscal_years"("year") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_items" ADD CONSTRAINT "evaluation_items_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_items" ADD CONSTRAINT "evaluation_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluatee_id_fkey" FOREIGN KEY ("evaluatee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_eval_item_id_fkey" FOREIGN KEY ("eval_item_id") REFERENCES "evaluation_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_fiscal_year_fkey" FOREIGN KEY ("fiscal_year") REFERENCES "fiscal_years"("year") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_comments" ADD CONSTRAINT "manager_comments_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_comments" ADD CONSTRAINT "manager_comments_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
