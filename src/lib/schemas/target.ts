import { z } from "zod";
import { nameField, positiveIntField } from "@/lib/schemas/common";

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
      no: positiveIntField("no").optional(),
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
