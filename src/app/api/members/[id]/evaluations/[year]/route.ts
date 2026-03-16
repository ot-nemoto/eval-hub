import { auth } from "@/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; year: string }> },
) {
  const session = await auth();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }

  const { id: evaluateeId, year } = await params;
  const fiscalYear = Number(year);
  if (Number.isNaN(fiscalYear)) {
    return errorResponse("BAD_REQUEST", "year は数値で指定してください", 400);
  }

  const currentUserId = session.user.id;
  const isAdmin = session.user.role === "admin";
  const isSelf = currentUserId === evaluateeId;

  // 評価者かどうかチェック
  const isAssignedEvaluator = !isSelf && !isAdmin
    ? await prisma.evaluationAssignment.findFirst({
        where: {
          fiscal_year: fiscalYear,
          evaluatee_id: evaluateeId,
          evaluator_id: currentUserId,
        },
      }).then((r) => r !== null)
    : false;

  if (!isAdmin && !isSelf && !isAssignedEvaluator) {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const evaluations = await prisma.evaluation.findMany({
    where: { fiscal_year: fiscalYear, evaluatee_id: evaluateeId },
    include: { evaluation_item: { select: { name: true } } },
    orderBy: { eval_uid: "asc" },
  });

  return successResponse(
    evaluations.map((e) => ({
      eval_uid: e.eval_uid,
      item_name: e.evaluation_item.name,
      self_score: e.self_score,
      self_reason: e.self_reason,
      manager_score: e.manager_score,
      manager_reason: e.manager_reason,
    })),
  );
}
