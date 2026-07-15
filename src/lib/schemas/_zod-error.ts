import type { ZodError } from "zod";

/**
 * Zod のバリデーションエラーから先頭 issue のメッセージを取り出す。
 * API は `{ error: "<日本語メッセージ>" }`（400）で返すため、
 * スキーマ側で各フィールドに日本語メッセージを設定しておく。
 */
export function firstZodError(error: ZodError): string {
  return error.issues[0]?.message ?? "リクエストが不正です";
}
