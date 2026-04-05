import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; year: string }> },
) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }

  const { id: evaluateeId, year } = await params;
  const fiscalYear = Number(year);
  if (Number.isNaN(fiscalYear)) {
    return errorResponse("BAD_REQUEST", "year は数値で指定してください", 400);
  }

  const currentUserId = session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const isSelf = currentUserId === evaluateeId;

  // 評価者かどうかチェック
  const isAssignedEvaluator = !isSelf && !isAdmin
    ? await prisma.evaluationAssignment.findFirst({
        where: {
          fiscalYear: fiscalYear,
          evaluateeId: evaluateeId,
          evaluatorId: currentUserId,
        },
      }).then((r) => r !== null)
    : false;

  if (!isAdmin && !isSelf && !isAssignedEvaluator) {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const evaluations = await prisma.evaluation.findMany({
    where: { fiscalYear: fiscalYear, evaluateeId: evaluateeId },
    include: { evaluationItem: { select: { name: true } } },
    orderBy: { evalItemId: "asc" },
  });

  return successResponse(
    evaluations.map((e) => ({
      eval_item_id: e.evalItemId,
      item_name: e.evaluationItem.name,
      self_score: e.selfScore,
      self_reason: e.selfReason,
      manager_score: e.managerScore,
      manager_reason: e.managerReason,
    })),
  );
}
