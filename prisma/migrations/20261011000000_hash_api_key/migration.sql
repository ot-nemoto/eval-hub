-- AlterTable
ALTER TABLE "users" ADD COLUMN     "api_key_created_at" TIMESTAMP(3),
ADD COLUMN     "api_key_hash" VARCHAR(64),
ADD COLUMN     "api_key_last_used_at" TIMESTAMP(3),
ADD COLUMN     "api_key_prefix" VARCHAR(8);

-- 既存の平文キーをハッシュ化して移行する（利用者の再発行は不要）。
-- アプリ側 hashApiKey()（文字列の UTF-8 バイト列の SHA-256・hex）と一致させるため convert_to を使う。
-- "api_key"::bytea はエラーにならないが、text からの I/O 変換キャストとして値を bytea の入力書式
-- （byteain）で解析するため、UTF-8 バイト列にならない（`\x` で始まる値は hex として解釈され、
-- バックスラッシュはエスケープとして扱われる）。その場合は黙って別のハッシュになり、移行後に認証が通らない。
-- 元の発行日時は記録がないため、api_key_created_at は移行時刻とする。
UPDATE "users"
SET "api_key_hash" = encode(sha256(convert_to("api_key", 'UTF8')), 'hex'),
    "api_key_prefix" = left("api_key", 8),
    "api_key_created_at" = CURRENT_TIMESTAMP
WHERE "api_key" IS NOT NULL;

-- DropIndex
DROP INDEX "users_api_key_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "api_key";

-- CreateIndex
CREATE UNIQUE INDEX "users_api_key_hash_key" ON "users"("api_key_hash");
