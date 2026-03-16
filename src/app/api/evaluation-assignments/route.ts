import { auth } from "@/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }
  if (session.user.role !== "admin") {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const { searchParams } = new URL(request.url);
  const fiscalYearParam = searchParams.get("fiscal_year");
  const fiscalYear = fiscalYearParam ? Number(fiscalYearParam) : undefined;

  if (fiscalYearParam && Number.isNaN(fiscalYear)) {
    return errorResponse("BAD_REQUEST", "fiscal_year は数値で指定してください", 400);
  }

  const assignments = await prisma.evaluationAssignment.findMany({
    where: fiscalYear ? { fiscal_year: fiscalYear } : undefined,
    include: {
      evaluatee: { select: { id: true, name: true } },
      evaluator: { select: { id: true, name: true } },
    },
    orderBy: [{ fiscal_year: "desc" }, { evaluatee_id: "asc" }],
  });

  return successResponse(
    assignments.map((a) => ({
      id: a.id,
      fiscal_year: a.fiscal_year,
      evaluatee: a.evaluatee,
      evaluator: a.evaluator,
    })),
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }
  if (session.user.role !== "admin") {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.fiscal_year !== "number" ||
    typeof body.evaluatee_id !== "string" ||
    typeof body.evaluator_id !== "string"
  ) {
    return errorResponse("BAD_REQUEST", "fiscal_year, evaluatee_id, evaluator_id は必須です", 400);
  }

  const existing = await prisma.evaluationAssignment.findUnique({
    where: {
      fiscal_year_evaluatee_id_evaluator_id: {
        fiscal_year: body.fiscal_year,
        evaluatee_id: body.evaluatee_id,
        evaluator_id: body.evaluator_id,
      },
    },
  });
  if (existing) {
    return errorResponse("CONFLICT", "同一年度・被評価者・評価者の組み合わせがすでに存在します", 409);
  }

  const assignment = await prisma.evaluationAssignment.create({
    data: {
      fiscal_year: body.fiscal_year,
      evaluatee_id: body.evaluatee_id,
      evaluator_id: body.evaluator_id,
    },
  });

  return successResponse(assignment, undefined, 201);
}
