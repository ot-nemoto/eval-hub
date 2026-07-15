import { z } from "zod";

/** エラーレスポンス `{ error: string }`（OpenAPI ドキュメント用）。 */
export const errorResponseSchema = z.object({ error: z.string() });
