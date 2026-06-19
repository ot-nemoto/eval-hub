-- AlterTable
ALTER TABLE "users" ADD COLUMN "api_key" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "users_api_key_key" ON "users"("api_key");
