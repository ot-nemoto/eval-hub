import { z } from "zod";

/** エラーレスポンス `{ error: string }`（OpenAPI ドキュメント用）。 */
export const errorResponseSchema = z.object({ error: z.string() });

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
