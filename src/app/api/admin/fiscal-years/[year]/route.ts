// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ year: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (!Number.isInteger(year))
    return errorResponse("BAD_REQUEST", "year は整数で指定してください", 400);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse("BAD_REQUEST", "リクエストボディが不正です", 400);

  const target = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!target) return errorResponse("NOT_FOUND", "年度が見つかりません", 404);

  const data: {
    name?: string;
    startDate?: Date;
    endDate?: Date;
    isCurrent?: boolean;
  } = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.startDate === "string") data.startDate = new Date(body.startDate);
  if (typeof body.endDate === "string") data.endDate = new Date(body.endDate);
  if (typeof body.isCurrent === "boolean") data.isCurrent = body.isCurrent;

  if (Object.keys(data).length === 0)
    return errorResponse("BAD_REQUEST", "更新可能なフィールドが指定されていません", 400);

  if (data.startDate && Number.isNaN(data.startDate.getTime()))
    return errorResponse("BAD_REQUEST", "startDate は有効な日付形式で指定してください", 400);
  if (data.endDate && Number.isNaN(data.endDate.getTime()))
    return errorResponse("BAD_REQUEST", "endDate は有効な日付形式で指定してください", 400);

  // 両方指定された場合、または片方が指定されてもう一方が既存値から取れる場合の整合性チェック
  const effectiveStart = data.startDate ?? target.startDate;
  const effectiveEnd = data.endDate ?? target.endDate;
  if (effectiveStart > effectiveEnd)
    return errorResponse("BAD_REQUEST", "startDate は endDate 以前の日付を指定してください", 400);

  const updated = await prisma.$transaction(async (tx) => {
    // isCurrent: true にする場合、他の年度を false に
    if (data.isCurrent === true) {
      await tx.fiscalYear.updateMany({
        where: { isCurrent: true, year: { not: year } },
        data: { isCurrent: false },
      });
    }
    return tx.fiscalYear.update({
      where: { year },
      data,
      select: { year: true, name: true, startDate: true, endDate: true, isCurrent: true },
    });
  });

  return successResponse(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (!Number.isInteger(year))
    return errorResponse("BAD_REQUEST", "year は整数で指定してください", 400);

  const target = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!target) return errorResponse("NOT_FOUND", "年度が見つかりません", 404);

  const [assignmentCount, evaluationCount, settingCount, itemCount] = await Promise.all([
    prisma.evaluationAssignment.count({ where: { fiscalYear: year } }),
    prisma.evaluation.count({ where: { fiscalYear: year } }),
    prisma.evaluationSetting.count({ where: { fiscalYear: year } }),
    prisma.fiscalYearItem.count({ where: { fiscalYear: year } }),
  ]);

  if (assignmentCount > 0 || evaluationCount > 0 || settingCount > 0 || itemCount > 0) {
    return errorResponse("CONFLICT", "紐づくデータが存在するため削除できません", 409);
  }

  await prisma.fiscalYear.delete({ where: { year } });
  return new Response(null, { status: 204 });
}
