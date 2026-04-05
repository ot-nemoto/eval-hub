// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ year: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (!Number.isInteger(year))
    return errorResponse("BAD_REQUEST", "year は整数で指定してください", 400);

  const fiscalYear = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!fiscalYear) return errorResponse("NOT_FOUND", "年度が見つかりません", 404);

  const items = await prisma.fiscalYearItem.findMany({
    where: { fiscalYear: year },
    include: {
      evaluationItem: {
        select: {
          id: true,
          targetId: true,
          categoryId: true,
          no: true,
          name: true,
        },
      },
    },
    orderBy: { evaluationItem: { no: "asc" } },
  });

  return successResponse(items.map((i) => i.evaluationItem));
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (!Number.isInteger(year))
    return errorResponse("BAD_REQUEST", "year は整数で指定してください", 400);

  const body = await request.json().catch(() => null);
  if (!body || !Number.isInteger(body.evaluationItemId) || body.evaluationItemId < 1) {
    return errorResponse("BAD_REQUEST", "evaluationItemId は正の整数で指定してください", 400);
  }

  const fiscalYear = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!fiscalYear) return errorResponse("NOT_FOUND", "年度が見つかりません", 404);

  const item = await prisma.evaluationItem.findUnique({ where: { id: body.evaluationItemId } });
  if (!item) return errorResponse("NOT_FOUND", "評価項目が見つかりません", 404);

  const existing = await prisma.fiscalYearItem.findUnique({
    where: {
      fiscalYear_evaluationItemId: {
        fiscalYear: year,
        evaluationItemId: body.evaluationItemId,
      },
    },
  });
  if (existing) return errorResponse("CONFLICT", "すでに紐づいています", 409);

  const created = await prisma.fiscalYearItem.create({
    data: { fiscalYear: year, evaluationItemId: body.evaluationItemId },
    select: { fiscalYear: true, evaluationItemId: true },
  });

  return successResponse(created, undefined, 201);
}
