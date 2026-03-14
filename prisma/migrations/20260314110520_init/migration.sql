-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'member');

-- CreateEnum
CREATE TYPE "Score" AS ENUM ('none', 'ka', 'ryo', 'yu');

-- CreateEnum
CREATE TYPE "Necessity" AS ENUM ('required', 'half');

-- CreateEnum
CREATE TYPE "Judgment" AS ENUM ('qualified', 'unqualified', 'none');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "division" VARCHAR(100),
    "joined_at" DATE,
    "role" "UserRole" NOT NULL,
    "manager_id" TEXT,
    "wants_president_meeting" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "division" VARCHAR(100) NOT NULL,

    CONSTRAINT "assignment_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "current_roles_self" TEXT[],
    "current_roles_official" TEXT[],
    "current_position" VARCHAR(50),
    "future_roles_self" TEXT[],
    "future_position_self" VARCHAR(50),
    "future_comment" TEXT,
    "achievements_pr" TEXT,
    "next_year_goals" TEXT,
    "interim_comment" TEXT,
    "final_comment" TEXT,

    CONSTRAINT "career_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "career_plan_id" TEXT NOT NULL,
    "category" VARCHAR(100),
    "title" VARCHAR(255) NOT NULL,
    "goal_criteria" TEXT,
    "action" TEXT,
    "period" VARCHAR(50),
    "progress" TEXT,
    "progress_official" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_eval_links" (
    "goal_id" TEXT NOT NULL,
    "eval_uid" VARCHAR(20) NOT NULL,

    CONSTRAINT "goal_eval_links_pkey" PRIMARY KEY ("goal_id","eval_uid")
);

-- CreateTable
CREATE TABLE "evaluation_items" (
    "uid" VARCHAR(20) NOT NULL,
    "target" VARCHAR(50) NOT NULL,
    "target_no" INTEGER,
    "category" VARCHAR(100) NOT NULL,
    "category_no" INTEGER,
    "item_no" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "eval_criteria" TEXT,
    "two_year_rule" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "evaluation_items_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "eval_uid" VARCHAR(20) NOT NULL,
    "self_score" "Score",
    "self_reason" TEXT,
    "manager_score" "Score",
    "manager_reason" TEXT,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "classification" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "required_criteria" TEXT,
    "special_criteria" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_eval_mappings" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "eval_uid" VARCHAR(20) NOT NULL,
    "necessity" "Necessity" NOT NULL,
    "required_level" "Score" NOT NULL,

    CONSTRAINT "role_eval_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "judgment" "Judgment" NOT NULL,
    "qualified_count" INTEGER,
    "total_count" INTEGER,

    CONSTRAINT "role_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocations" (
    "id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "division" VARCHAR(100) NOT NULL,
    "eval_uid" VARCHAR(20) NOT NULL,
    "weight" INTEGER NOT NULL,

    CONSTRAINT "allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "record_month" DATE NOT NULL,
    "product" VARCHAR(100) NOT NULL,
    "task" VARCHAR(255) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "monthly_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "career_plans_user_id_fiscal_year_key" ON "career_plans"("user_id", "fiscal_year");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_user_id_fiscal_year_eval_uid_key" ON "evaluations"("user_id", "fiscal_year", "eval_uid");

-- CreateIndex
CREATE UNIQUE INDEX "roles_classification_name_key" ON "roles"("classification", "name");

-- CreateIndex
CREATE UNIQUE INDEX "role_members_user_id_role_id_fiscal_year_key" ON "role_members"("user_id", "role_id", "fiscal_year");

-- CreateIndex
CREATE UNIQUE INDEX "allocations_fiscal_year_division_eval_uid_key" ON "allocations"("fiscal_year", "division", "eval_uid");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_records_user_id_record_month_product_task_key" ON "monthly_records"("user_id", "record_month", "product", "task");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_histories" ADD CONSTRAINT "assignment_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_plans" ADD CONSTRAINT "career_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_career_plan_id_fkey" FOREIGN KEY ("career_plan_id") REFERENCES "career_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_eval_links" ADD CONSTRAINT "goal_eval_links_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_eval_links" ADD CONSTRAINT "goal_eval_links_eval_uid_fkey" FOREIGN KEY ("eval_uid") REFERENCES "evaluation_items"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_eval_uid_fkey" FOREIGN KEY ("eval_uid") REFERENCES "evaluation_items"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_eval_mappings" ADD CONSTRAINT "role_eval_mappings_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_eval_mappings" ADD CONSTRAINT "role_eval_mappings_eval_uid_fkey" FOREIGN KEY ("eval_uid") REFERENCES "evaluation_items"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_members" ADD CONSTRAINT "role_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_members" ADD CONSTRAINT "role_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_eval_uid_fkey" FOREIGN KEY ("eval_uid") REFERENCES "evaluation_items"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_records" ADD CONSTRAINT "monthly_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
