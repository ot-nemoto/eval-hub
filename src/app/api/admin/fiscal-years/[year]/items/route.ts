// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ year: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (!Number.isInteger(year))
    return errorResponse("BAD_REQUEST", "year は整数で指定してください", 400);

  const fiscalYear = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!fiscalYear) return errorResponse("NOT_FOUND", "年度が見つかりません", 404);

  const items = await prisma.fiscalYearItem.findMany({
    where: { fiscal_year: year },
    include: {
      evaluation_item: {
        select: {
          id: true,
          target_id: true,
          category_id: true,
          no: true,
          name: true,
        },
      },
    },
    orderBy: { evaluation_item: { no: "asc" } },
  });

  return successResponse(items.map((i) => i.evaluation_item));
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (!Number.isInteger(year))
    return errorResponse("BAD_REQUEST", "year は整数で指定してください", 400);

  const body = await request.json().catch(() => null);
  if (!body || !Number.isInteger(body.evaluation_item_id) || body.evaluation_item_id < 1) {
    return errorResponse("BAD_REQUEST", "evaluation_item_id は正の整数で指定してください", 400);
  }

  const fiscalYear = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!fiscalYear) return errorResponse("NOT_FOUND", "年度が見つかりません", 404);

  const item = await prisma.evaluationItem.findUnique({ where: { id: body.evaluation_item_id } });
  if (!item) return errorResponse("NOT_FOUND", "評価項目が見つかりません", 404);

  const existing = await prisma.fiscalYearItem.findUnique({
    where: {
      fiscal_year_evaluation_item_id: {
        fiscal_year: year,
        evaluation_item_id: body.evaluation_item_id,
      },
    },
  });
  if (existing) return errorResponse("CONFLICT", "すでに紐づいています", 409);

  const created = await prisma.fiscalYearItem.create({
    data: { fiscal_year: year, evaluation_item_id: body.evaluation_item_id },
    select: { fiscal_year: true, evaluation_item_id: true },
  });

  return successResponse(created, undefined, 201);
}
