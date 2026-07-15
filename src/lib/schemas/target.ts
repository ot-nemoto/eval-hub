import { z } from "zod";

/** 非空の名称フィールド（空文字・空白のみを弾く）。 */
const nameField = z
  .string({ error: "name は必須です" })
  .refine((v) => v.trim().length > 0, { error: "name は必須です" });

/** 管理番号フィールド（1 以上の整数）。 */
const noField = z
  .number({ error: "no は数値で指定してください" })
  .int({ error: "no は整数で指定してください" })
  .min(1, { error: "no は 1 以上で指定してください" });

/**
 * 大分類の作成 body。no・index は lib（`createTarget`）が自動採番する。
 */
export const targetCreateBodySchema = z.object(
  { name: nameField },
  { error: "リクエストボディが不正です" },
);

/** 大分類の更新 body（name・no は任意だが、少なくとも一方を指定）。 */
export const targetUpdateBodySchema = z
  .object(
    {
      name: nameField.optional(),
      no: noField.optional(),
    },
    { error: "リクエストボディが不正です" },
  )
  .refine((d) => d.name !== undefined || d.no !== undefined, {
    error: "name または no を指定してください",
  });

/** 大分類のレスポンス形式。 */
export const targetResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  no: z.number().int(),
  index: z.number().int(),
});

/** GET /api/targets のレスポンス（一覧ラッパ）。 */
export const targetListResponseSchema = z.object({
  targets: z.array(targetResponseSchema),
});
