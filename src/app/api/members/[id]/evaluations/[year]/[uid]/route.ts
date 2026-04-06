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

  const { id: evaluateeId, year, uid: _evalUid } = await params;
  const fiscalYear = Number(year);
  if (Number.isNaN(fiscalYear)) {
    return errorResponse("BAD_REQUEST", "year は数値で指定してください", 400);
  }

  const currentUserId = session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const isSelf = currentUserId === evaluateeId;

  const isAssignedEvaluator =
    !isSelf && !isAdmin
      ? await prisma.evaluationAssignment
          .findFirst({
            where: {
              fiscalYear: fiscalYear,
              evaluateeId: evaluateeId,
              evaluatorId: currentUserId,
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
  // このエンドポイントのリクエスト/レスポンスキーは snake_case を維持する（API contract）
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
      where: { userId_fiscalYear: { userId: evaluateeId, fiscalYear: fiscalYear } },
    });
    if (!setting?.selfEvaluationEnabled) {
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
  if (self_score !== undefined) updateData.selfScore = self_score;
  if (self_reason !== undefined) updateData.selfReason = self_reason;
  if (manager_score !== undefined) updateData.managerScore = manager_score;
  if (manager_reason !== undefined) updateData.managerReason = manager_reason;

  const evaluation = await prisma.evaluation.upsert({
    where: {
      fiscalYear_evaluateeId_evalItemId: {
        fiscalYear: fiscalYear,
        evaluateeId: evaluateeId,
        evalItemId: itemId,
      },
    },
    create: {
      fiscalYear: fiscalYear,
      evaluateeId: evaluateeId,
      evalItemId: itemId,
      ...updateData,
    },
    update: updateData,
  });

  return successResponse({
    eval_item_id: evaluation.evalItemId,
    self_score: evaluation.selfScore,
    self_reason: evaluation.selfReason,
    manager_score: evaluation.managerScore,
    manager_reason: evaluation.managerReason,
  });
}
