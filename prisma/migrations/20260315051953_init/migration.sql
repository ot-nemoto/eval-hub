-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "Score" AS ENUM ('none', 'ka', 'ryo', 'yu');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "division" VARCHAR(100),
    "joined_at" DATE,
    "role" "UserRole" NOT NULL,
    "wants_president_meeting" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
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
    "fiscal_year" INTEGER NOT NULL,
    "evaluatee_id" TEXT NOT NULL,
    "eval_uid" VARCHAR(20) NOT NULL,
    "self_score" "Score",
    "self_reason" TEXT,
    "manager_score" "Score",
    "manager_reason" TEXT,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_assignments_fiscal_year_evaluatee_id_evaluator_i_key" ON "evaluation_assignments"("fiscal_year", "evaluatee_id", "evaluator_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_fiscal_year_evaluatee_id_eval_uid_key" ON "evaluations"("fiscal_year", "evaluatee_id", "eval_uid");

-- AddForeignKey
ALTER TABLE "evaluation_assignments" ADD CONSTRAINT "evaluation_assignments_evaluatee_id_fkey" FOREIGN KEY ("evaluatee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_assignments" ADD CONSTRAINT "evaluation_assignments_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluatee_id_fkey" FOREIGN KEY ("evaluatee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_eval_uid_fkey" FOREIGN KEY ("eval_uid") REFERENCES "evaluation_items"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;
