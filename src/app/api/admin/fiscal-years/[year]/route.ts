// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ year: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (!Number.isInteger(year))
    return errorResponse("BAD_REQUEST", "year は整数で指定してください", 400);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse("BAD_REQUEST", "リクエストボディが不正です", 400);

  const allowedKeys = ["name", "start_date", "end_date", "is_current"];
  const hasValidKey = allowedKeys.some((k) => k in body);
  if (!hasValidKey)
    return errorResponse("BAD_REQUEST", "更新可能なフィールドが指定されていません", 400);

  const target = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!target) return errorResponse("NOT_FOUND", "年度が見つかりません", 404);

  const data: {
    name?: string;
    start_date?: Date;
    end_date?: Date;
    is_current?: boolean;
  } = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.start_date === "string") data.start_date = new Date(body.start_date);
  if (typeof body.end_date === "string") data.end_date = new Date(body.end_date);
  if (typeof body.is_current === "boolean") data.is_current = body.is_current;

  const updated = await prisma.$transaction(async (tx) => {
    // is_current: true にする場合、他の年度を false に
    if (data.is_current === true) {
      await tx.fiscalYear.updateMany({
        where: { is_current: true, year: { not: year } },
        data: { is_current: false },
      });
    }
    return tx.fiscalYear.update({
      where: { year },
      data,
      select: { year: true, name: true, start_date: true, end_date: true, is_current: true },
    });
  });

  return successResponse(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (!Number.isInteger(year))
    return errorResponse("BAD_REQUEST", "year は整数で指定してください", 400);

  const target = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!target) return errorResponse("NOT_FOUND", "年度が見つかりません", 404);

  const [assignmentCount, evaluationCount, settingCount, itemCount] = await Promise.all([
    prisma.evaluationAssignment.count({ where: { fiscal_year: year } }),
    prisma.evaluation.count({ where: { fiscal_year: year } }),
    prisma.evaluationSetting.count({ where: { fiscal_year: year } }),
    prisma.fiscalYearItem.count({ where: { fiscal_year: year } }),
  ]);

  if (assignmentCount > 0 || evaluationCount > 0 || settingCount > 0 || itemCount > 0) {
    return errorResponse("CONFLICT", "紐づくデータが存在するため削除できません", 409);
  }

  await prisma.fiscalYear.delete({ where: { year } });
  return new Response(null, { status: 204 });
}
