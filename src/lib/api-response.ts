import { NextResponse } from "next/server";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";

/** `{ error }` ボディ付きのエラーレスポンスを返す。 */
export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** 認証失敗（401）レスポンス。 */
export function unauthorized() {
  return jsonError("API キーが無効です", 401);
}

/**
 * lib が投げる型付きエラーを HTTP ステータスにマッピングする。
 * NotFoundError→404 / ForbiddenError→403 / ConflictError→409 / BadRequestError→400 / その他→500。
 */
export function statusForError(error: unknown): number {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof ConflictError) return 409;
  if (error instanceof BadRequestError) return 400;
  return 500;
}

type SerializableEvaluationItem = {
  id: number;
  no: number;
  name: string;
  description: string | null;
  evalCriteria: string | null;
  target: { id: number; no: number; name: string };
  category: { id: number; no: number; name: string };
};

/** 評価項目を外部 API レスポンス形式（camelCase / target・category をネスト）に整形する。 */
export function serializeEvaluationItem(item: SerializableEvaluationItem) {
  return {
    id: item.id,
    no: item.no,
    name: item.name,
    description: item.description,
    evalCriteria: item.evalCriteria,
    target: { id: item.target.id, no: item.target.no, name: item.target.name },
    category: { id: item.category.id, no: item.category.no, name: item.category.name },
  };
}
