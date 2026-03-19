import { getSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; year: string; uid: string }> },
) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }

  const { id: evaluateeId, year, uid: evalUid } = await params;
  const fiscalYear = Number(year);
  if (Number.isNaN(fiscalYear)) {
    return errorResponse("BAD_REQUEST", "year は数値で指定してください", 400);
  }

  const currentUserId = session.user.id;
  const isAdmin = session.user.role === "admin";
  const isSelf = currentUserId === evaluateeId;

  const isAssignedEvaluator =
    !isSelf && !isAdmin
      ? await prisma.evaluationAssignment
          .findFirst({
            where: {
              fiscal_year: fiscalYear,
              evaluatee_id: evaluateeId,
              evaluator_id: currentUserId,
            },
          })
          .then((r) => r !== null)
      : false;

  if (!isAdmin && !isSelf && !isAssignedEvaluator) {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return errorResponse("BAD_REQUEST", "リクエストボディが不正です", 400);
  }
  const { self_score, self_reason, manager_score, manager_reason } = body;

  const hasSelfFields = self_score !== undefined || self_reason !== undefined;
  const hasManagerFields =
    manager_score !== undefined || manager_reason !== undefined;

  if (hasSelfFields && !isSelf) {
    return errorResponse(
      "FORBIDDEN",
      "self_score/self_reason は本人のみ更新できます",
      403,
    );
  }

  if (hasSelfFields && isSelf) {
    const setting = await prisma.evaluationSetting.findUnique({
      where: { user_id_fiscal_year: { user_id: evaluateeId, fiscal_year: fiscalYear } },
    });
    if (!setting?.self_evaluation_enabled) {
      return errorResponse("FORBIDDEN", "この年度は自己評価が不要に設定されています", 403);
    }
  }

  if (hasManagerFields && !isAdmin && !isAssignedEvaluator) {
    return errorResponse(
      "FORBIDDEN",
      "manager_score/manager_reason はアサインされた評価者または admin のみ更新できます",
      403,
    );
  }

  const updateData: Record<string, unknown> = {};
  if (self_score !== undefined) updateData.self_score = self_score;
  if (self_reason !== undefined) updateData.self_reason = self_reason;
  if (manager_score !== undefined) updateData.manager_score = manager_score;
  if (manager_reason !== undefined) updateData.manager_reason = manager_reason;

  const evaluation = await prisma.evaluation.upsert({
    where: {
      fiscal_year_evaluatee_id_eval_uid: {
        fiscal_year: fiscalYear,
        evaluatee_id: evaluateeId,
        eval_uid: evalUid,
      },
    },
    create: {
      fiscal_year: fiscalYear,
      evaluatee_id: evaluateeId,
      eval_uid: evalUid,
      ...updateData,
    },
    update: updateData,
  });

  return successResponse({
    eval_uid: evaluation.eval_uid,
    self_score: evaluation.self_score,
    self_reason: evaluation.self_reason,
    manager_score: evaluation.manager_score,
    manager_reason: evaluation.manager_reason,
  });
}
