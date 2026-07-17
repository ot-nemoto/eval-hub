import { z } from "zod";
import { nameField, positiveIntField } from "@/lib/schemas/common";

/**
 * 中分類の作成 body。`targetId`（所属大分類）と `name` が必須。
 * no・index は lib（`createCategory`）が自動採番する。
 */
export const categoryCreateBodySchema = z.object(
  {
    targetId: positiveIntField("targetId"),
    name: nameField,
  },
  { error: "リクエストボディが不正です" },
);

/** 中分類の更新 body（name・no は任意だが、少なくとも一方を指定）。 */
export const categoryUpdateBodySchema = z
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
