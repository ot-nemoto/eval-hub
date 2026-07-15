import { z } from "zod";

/**
 * 中分類の作成 body。`targetId`（所属大分類）と `name` が必須。
 * no・index は lib（`createCategory`）が自動採番する。
 */
export const categoryCreateBodySchema = z.object(
  {
    targetId: z
      .number({ error: "targetId は必須です" })
      .int({ error: "targetId は整数で指定してください" }),
    name: z.string({ error: "name は必須です" }),
  },
  { error: "リクエストボディが不正です" },
);

/** 中分類の更新 body（name・no は任意）。 */
export const categoryUpdateBodySchema = z.object(
  {
    name: z.string({ error: "name は文字列で指定してください" }).optional(),
    no: z
      .number({ error: "no は数値で指定してください" })
      .int({ error: "no は整数で指定してください" })
      .optional(),
  },
  { error: "リクエストボディが不正です" },
);

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
