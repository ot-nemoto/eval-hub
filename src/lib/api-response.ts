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

/**
 * catch した例外を `{ error }` レスポンスに変換する。
 * 型付きエラー（400/403/404/409）は意図した日本語メッセージをそのまま返すが、
 * 想定外エラー（500）は内部情報の露出を避けるため汎用文言に固定する。
 */
export function jsonErrorFromException(error: unknown) {
  const status = statusForError(error);
  const message = status === 500 ? "サーバーエラーが発生しました" : (error as Error).message;
  return jsonError(message, status);
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

type SerializableTarget = { id: number; name: string; no: number; index: number };

/** 大分類を外部 API レスポンス形式に整形する。 */
export function serializeTarget(t: SerializableTarget) {
  return { id: t.id, name: t.name, no: t.no, index: t.index };
}

type SerializableCategory = {
  id: number;
  targetId: number;
  name: string;
  no: number;
  index: number;
};

/** 中分類を外部 API レスポンス形式に整形する。 */
export function serializeCategory(c: SerializableCategory) {
  return { id: c.id, targetId: c.targetId, name: c.name, no: c.no, index: c.index };
}
