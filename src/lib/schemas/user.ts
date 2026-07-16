import { z } from "zod";

/** ユーザーのロール。 */
export const roleSchema = z.enum(["ADMIN", "MEMBER"]);

/**
 * ユーザー更新 body（role・isActive は任意）。空 body・自分自身の更新は
 * lib（`updateUser`）が BadRequest→400 / Forbidden→403 を返す。
 */
export const userUpdateBodySchema = z.object(
  {
    role: roleSchema.optional(),
    isActive: z.boolean({ error: "isActive は真偽値で指定してください" }).optional(),
  },
  { error: "リクエストボディが不正です" },
);

/** ユーザーのレスポンス形式（一覧）。 */
export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: roleSchema,
  division: z.string().nullable(),
  joinedAt: z.string().nullable(),
  createdAt: z.string(),
  isActive: z.boolean(),
});

/** GET /api/users のレスポンス（一覧ラッパ）。 */
export const userListResponseSchema = z.object({
  users: z.array(userResponseSchema),
});

/** ユーザー更新（PATCH）のレスポンス。 */
export const userUpdateResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
});
