-- is_current = true の行は最大1件のみ許可する部分ユニークインデックス
CREATE UNIQUE INDEX IF NOT EXISTS fiscal_years_is_current_unique
  ON fiscal_years (is_current)
  WHERE is_current = true;
