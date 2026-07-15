import { z } from "zod";

/**
 * 大分類の作成 body。route の責務は「`name` が文字列か」の検証のみ。
 * no・index は lib（`createTarget`）が自動採番する。
 */
export const targetCreateBodySchema = z.object(
  { name: z.string({ error: "name は必須です" }) },
  { error: "リクエストボディが不正です" },
);

/** 大分類の更新 body（name・no は任意。少なくとも一方を指定）。 */
export const targetUpdateBodySchema = z.object(
  {
    name: z.string({ error: "name は文字列で指定してください" }).optional(),
    no: z
      .number({ error: "no は数値で指定してください" })
      .int({ error: "no は整数で指定してください" })
      .optional(),
  },
  { error: "リクエストボディが不正です" },
);

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
