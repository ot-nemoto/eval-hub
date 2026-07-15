import { z } from "zod";
import { nameField } from "@/lib/schemas/common";

const yearField = z
  .number({
    error: (iss) => (iss.input === undefined ? "year は必須です" : "year は数値で指定してください"),
  })
  .int({ error: "year は整数で指定してください" })
  .min(1900, { error: "year は 1900〜9999 で指定してください" })
  .max(9999, { error: "year は 1900〜9999 で指定してください" });

const dateField = (label: string) => z.string({ error: `${label} は必須です` });

/**
 * 年度の作成 body。日付の妥当性・startDate≤endDate・year 重複(409) は
 * lib（`createFiscalYear`）が担保する。
 */
export const fiscalYearCreateBodySchema = z.object(
  {
    year: yearField,
    name: nameField,
    startDate: dateField("startDate"),
    endDate: dateField("endDate"),
  },
  { error: "リクエストボディが不正です" },
);

/**
 * 年度の更新 body（すべて任意）。空 body は lib（`updateFiscalYear`）が
 * BadRequest→400 を返す。
 */
export const fiscalYearUpdateBodySchema = z.object(
  {
    name: nameField.optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isCurrent: z.boolean({ error: "isCurrent は真偽値で指定してください" }).optional(),
  },
  { error: "リクエストボディが不正です" },
);

/** 年度のロック状態設定 body。 */
export const fiscalYearLockBodySchema = z.object(
  { isLocked: z.boolean({ error: "isLocked は真偽値で指定してください" }) },
  { error: "リクエストボディが不正です" },
);

/** 年度のレスポンス形式。 */
export const fiscalYearResponseSchema = z.object({
  year: z.number().int(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isCurrent: z.boolean(),
  isLocked: z.boolean(),
  evalItemVersionId: z.number().int().nullable(),
});

/** GET /api/fiscal-years のレスポンス（一覧ラッパ）。 */
export const fiscalYearListResponseSchema = z.object({
  fiscalYears: z.array(fiscalYearResponseSchema),
});
