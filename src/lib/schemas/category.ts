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
 * 中分類の作成 body。`targetId`（所属大分類）と `name` が必須。
 * no・index は lib（`createCategory`）が自動採番する。
 */
export const categoryCreateBodySchema = z.object(
  {
    targetId: z
      .number({ error: "targetId は必須です" })
      .int({ error: "targetId は整数で指定してください" })
      .min(1, { error: "targetId は 1 以上で指定してください" }),
    name: nameField,
  },
  { error: "リクエストボディが不正です" },
);

/** 中分類の更新 body（name・no は任意だが、少なくとも一方を指定）。 */
export const categoryUpdateBodySchema = z
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

/** 中分類のレスポンス形式。 */
export const categoryResponseSchema = z.object({
  id: z.number().int(),
  targetId: z.number().int(),
  name: z.string(),
  no: z.number().int(),
  index: z.number().int(),
});

/** GET /api/categories のレスポンス（一覧ラッパ）。 */
export const categoryListResponseSchema = z.object({
  categories: z.array(categoryResponseSchema),
});
