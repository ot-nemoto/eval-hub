-- CreateTable
CREATE TABLE "evaluation_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "self_evaluation_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "evaluation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_settings_user_id_fiscal_year_key" ON "evaluation_settings"("user_id", "fiscal_year");

-- AddForeignKey
ALTER TABLE "evaluation_settings" ADD CONSTRAINT "evaluation_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
