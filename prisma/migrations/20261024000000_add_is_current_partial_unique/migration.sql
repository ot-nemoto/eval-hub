-- Normalize: is_current = true の行が複数ある場合、最大 year の 1 行だけを残す。
-- この migration まで一意制約が無く、並行する年度更新で複数行が true になりえた（T236）。
-- 正規化せずに CREATE UNIQUE INDEX を実行すると既存データで失敗し、
-- vercel-build（prisma migrate deploy && next build）ごと落ちる。
-- 残す行の選び方は「最も新しい年度」。true の行が無い場合は副問い合わせが NULL を返し、
-- year <> NULL が NULL になるため 0 行更新で素通りする。
UPDATE "fiscal_years" SET "is_current" = false
WHERE "is_current" = true
  AND "year" <> (SELECT MAX("year") FROM "fiscal_years" WHERE "is_current" = true);

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_years_is_current_key" ON "fiscal_years"("is_current") WHERE ("is_current" = true);
