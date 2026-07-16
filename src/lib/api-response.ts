import { Prisma } from "@prisma/client";
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
 * 型付きエラー（400/403/404/409）は意図した日本語メッセージをそのまま返す。
 * Prisma の対象/参照欠落（P2025/P2003）は 404 に、想定外エラー（500）は
 * 内部情報の露出を避けるため汎用文言に固定する。
 */
export function jsonErrorFromException(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return jsonError("対象のデータが見つかりません", 404);
    // P2003 は「作成/更新時に参照先の親が存在しない」ケースを 404 とする。
    // 削除時の子依存（本来 409）は各 lib が事前に count()→ConflictError で弾いており、
    // ここに P2003-on-delete は到達しない前提（この invariant が崩れる削除を書く場合は要見直し）。
    if (error.code === "P2003") return jsonError("参照先のデータが見つかりません", 404);
  }
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

type SerializableFiscalYear = {
  year: number;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isLocked: boolean;
  evalItemVersionId: number | null;
};

/** 年度を外部 API レスポンス形式（日付は YYYY-MM-DD）に整形する。 */
export function serializeFiscalYear(fy: SerializableFiscalYear) {
  return {
    year: fy.year,
    name: fy.name,
    startDate: fy.startDate.toISOString().slice(0, 10),
    endDate: fy.endDate.toISOString().slice(0, 10),
    isCurrent: fy.isCurrent,
    isLocked: fy.isLocked,
    evalItemVersionId: fy.evalItemVersionId,
  };
}

type SerializableUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  division: string | null;
  joinedAt: Date | null;
  createdAt: Date;
  isActive: boolean;
};

/** ユーザーを外部 API レスポンス形式に整形する（joinedAt は YYYY-MM-DD、createdAt は ISO）。 */
export function serializeUser(u: SerializableUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    division: u.division,
    joinedAt: u.joinedAt ? u.joinedAt.toISOString().slice(0, 10) : null,
    createdAt: u.createdAt.toISOString(),
    isActive: u.isActive,
  };
}

type SerializableUserUpdate = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  isActive: boolean;
};

/**
 * ユーザー更新レスポンスをホワイトリスト整形する。
 * secret（apiKey・clerkId）非露出を lib の select だけに依存させず、
 * 応答経路の単一チョークポイントで担保する。
 */
export function serializeUserUpdate(u: SerializableUserUpdate) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive };
}
