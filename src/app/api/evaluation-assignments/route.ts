import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }
  if (session.user.role !== "ADMIN") {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const { searchParams } = new URL(request.url);
  const fiscalYearParam = searchParams.get("fiscalYear");
  const fiscalYear = fiscalYearParam ? Number(fiscalYearParam) : undefined;

  if (fiscalYearParam && Number.isNaN(fiscalYear)) {
    return errorResponse("BAD_REQUEST", "fiscalYear は数値で指定してください", 400);
  }

  const assignments = await prisma.evaluationAssignment.findMany({
    where: fiscalYear ? { fiscalYear: fiscalYear } : undefined,
    include: {
      evaluatee: { select: { id: true, name: true } },
      evaluator: { select: { id: true, name: true } },
    },
    orderBy: [{ fiscalYear: "desc" }, { evaluateeId: "asc" }],
  });

  return successResponse(
    assignments.map((a) => ({
      id: a.id,
      fiscalYear: a.fiscalYear,
      evaluatee: a.evaluatee,
      evaluator: a.evaluator,
    })),
  );
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }
  if (session.user.role !== "ADMIN") {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.fiscalYear !== "number" ||
    typeof body.evaluateeId !== "string" ||
    typeof body.evaluatorId !== "string"
  ) {
    return errorResponse("BAD_REQUEST", "fiscalYear, evaluateeId, evaluatorId は必須です", 400);
  }

  const existing = await prisma.evaluationAssignment.findUnique({
    where: {
      fiscalYear_evaluateeId_evaluatorId: {
        fiscalYear: body.fiscalYear,
        evaluateeId: body.evaluateeId,
        evaluatorId: body.evaluatorId,
      },
    },
  });
  if (existing) {
    return errorResponse(
      "CONFLICT",
      "同一年度・被評価者・評価者の組み合わせがすでに存在します",
      409,
    );
  }

  const assignment = await prisma.evaluationAssignment.create({
    data: {
      fiscalYear: body.fiscalYear,
      evaluateeId: body.evaluateeId,
      evaluatorId: body.evaluatorId,
    },
  });

  return successResponse(assignment, undefined, 201);
}
