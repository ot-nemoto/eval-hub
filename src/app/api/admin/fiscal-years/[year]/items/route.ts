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
          uid: true,
          target: true,
          target_no: true,
          category: true,
          category_no: true,
          item_no: true,
          name: true,
          two_year_rule: true,
        },
      },
    },
    orderBy: { evaluation_item: { uid: "asc" } },
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
  if (!body || typeof body.evaluation_item_uid !== "string") {
    return errorResponse("BAD_REQUEST", "evaluation_item_uid は必須です", 400);
  }

  const fiscalYear = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!fiscalYear) return errorResponse("NOT_FOUND", "年度が見つかりません", 404);

  const item = await prisma.evaluationItem.findUnique({ where: { uid: body.evaluation_item_uid } });
  if (!item) return errorResponse("NOT_FOUND", "評価項目が見つかりません", 404);

  const existing = await prisma.fiscalYearItem.findUnique({
    where: {
      fiscal_year_evaluation_item_uid: {
        fiscal_year: year,
        evaluation_item_uid: body.evaluation_item_uid,
      },
    },
  });
  if (existing) return errorResponse("CONFLICT", "すでに紐づいています", 409);

  const created = await prisma.fiscalYearItem.create({
    data: { fiscal_year: year, evaluation_item_uid: body.evaluation_item_uid },
    select: { fiscal_year: true, evaluation_item_uid: true },
  });

  return successResponse(created, undefined, 201);
}
