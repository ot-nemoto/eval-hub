"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Score } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { BadRequestError, ForbiddenError } from "@/lib/errors";
import { addManagerComment, deleteManagerComment, updateManagerComment } from "@/lib/evaluations";
import { prisma } from "@/lib/prisma";

type ManagerCommentPayload = {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  score: Score;
  reason: string | null;
  createdAt: Date;
};

export async function addManagerCommentAction(
  evaluateeId: string,
  fiscalYear: number,
  evalItemId: number,
  data: { score: Score; reason: string | null },
): Promise<{ error?: string; comment?: ManagerCommentPayload }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    return { error: "fiscalYear は 1900〜9999 の整数で指定してください" };
  if (!Number.isInteger(evalItemId) || evalItemId < 1)
    return { error: "evalItemId は正の整数で指定してください" };

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    const assignment = await prisma.evaluationAssignment.findUnique({
      where: {
        fiscalYear_evaluateeId_evaluatorId: {
          fiscalYear,
          evaluateeId,
          evaluatorId: session.user.id,
        },
      },
    });
    if (!assignment)
      return { error: "評価者としてアサインされていません" };
  }

  let created: Awaited<ReturnType<typeof addManagerComment>>;
  try {
    created = await addManagerComment(evaluateeId, fiscalYear, evalItemId, session.user.id, data);
  } catch (e) {
    if (e instanceof BadRequestError || e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }

  const evaluator = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  revalidatePath(`/members/${evaluateeId}/evaluations`);
  return {
    comment: {
      id: created.id,
      evaluatorId: created.evaluatorId,
      evaluatorName: evaluator?.name ?? "",
      score: created.score,
      reason: created.reason,
      createdAt: created.createdAt,
    },
  };
}

export async function updateManagerCommentAction(
  commentId: string,
  evaluateeId: string,
  data: { score?: Score; reason?: string | null },
): Promise<{ error?: string; comment?: ManagerCommentPayload }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const existing = await prisma.managerComment.findUnique({
    where: { id: commentId },
    include: { evaluator: { select: { name: true } } },
  });
  if (!existing) return { error: "コメントが見つかりません" };
  if (!isAdmin && existing.evaluatorId !== session.user.id)
    return { error: "自分のコメントのみ編集できます" };

  let updated: Awaited<ReturnType<typeof updateManagerComment>>;
  try {
    updated = await updateManagerComment(commentId, data);
  } catch (e) {
    if (e instanceof BadRequestError || e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }

  revalidatePath(`/members/${evaluateeId}/evaluations`);
  return {
    comment: {
      id: updated.id,
      evaluatorId: updated.evaluatorId,
      evaluatorName: existing.evaluator.name,
      score: updated.score,
      reason: updated.reason,
      createdAt: updated.createdAt,
    },
  };
}

export async function deleteManagerCommentAction(
  commentId: string,
  evaluateeId: string,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    const comment = await prisma.managerComment.findUnique({ where: { id: commentId } });
    if (!comment) return { error: "コメントが見つかりません" };
    if (comment.evaluatorId !== session.user.id) return { error: "自分のコメントのみ削除できます" };
  }

  try {
    await deleteManagerComment(commentId);
  } catch (e) {
    if (e instanceof BadRequestError || e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }

  revalidatePath(`/members/${evaluateeId}/evaluations`);
  return {};
}
