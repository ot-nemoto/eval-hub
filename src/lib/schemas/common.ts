import { z } from "zod";

/** エラーレスポンス `{ error: string }`（OpenAPI ドキュメント用）。 */
export const errorResponseSchema = z.object({ error: z.string() });

/** 非空の名称フィールド（空文字・空白のみを弾く）。REST 各リソースで共用。 */
export const nameField = z
  .string({ error: "name は必須です" })
  .refine((v) => v.trim().length > 0, { error: "name は必須です" });

/**
 * 1 以上の整数フィールド（`no`・`targetId`・`categoryId` 等で共用）。
 * 未指定・型不一致・非整数・範囲外で文言を分ける。
 */
export const positiveIntField = (label: string) =>
  z
    .number({
      error: (iss) =>
        iss.input === undefined ? `${label} は必須です` : `${label} は数値で指定してください`,
    })
    .int({ error: `${label} は整数で指定してください` })
    .min(1, { error: `${label} は 1 以上で指定してください` });

/** 年度フィールド（1900〜9999 の整数）。assignment・setting 等で共用。 */
export const fiscalYearField = z
  .number({
    error: (iss) =>
      iss.input === undefined ? "fiscalYear は必須です" : "fiscalYear は数値で指定してください",
  })
  .int({ error: "fiscalYear は整数で指定してください" })
  .min(1900, { error: "fiscalYear は 1900〜9999 で指定してください" })
  .max(9999, { error: "fiscalYear は 1900〜9999 で指定してください" });

/** 非空の ID 文字列フィールド（UUID 等）。 */
export const nonEmptyIdField = (label: string) =>
  z.string({ error: `${label} は必須です` }).min(1, { error: `${label} は必須です` });

/**
 * 並び替え（reorder）の body スキーマ。`{ orders: [{ id, index }] }`。
 * targets / categories / evaluation-items で共用する。id・index は整数。
 */
export const reorderBodySchema = z.object(
  {
    orders: z
      .array(
        z.object({
          id: z.number({ error: "id は必須です" }).int({ error: "id は整数で指定してください" }),
          index: z
            .number({ error: "index は必須です" })
            .int({ error: "index は整数で指定してください" }),
        }),
        { error: "orders は配列で指定してください" },
      )
      .min(1, { error: "orders は必須です" }),
  },
  { error: "リクエストボディが不正です" },
);
