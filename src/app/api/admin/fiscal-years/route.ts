// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const fiscalYears = await prisma.fiscalYear.findMany({
    orderBy: { year: "desc" },
    select: { year: true, name: true, startDate: true, endDate: true, isCurrent: true },
  });

  return successResponse(fiscalYears);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const body = await request.json().catch(() => null);
  if (
    !body ||
    !Number.isInteger(body.year) ||
    body.year < 1900 ||
    body.year > 9999 ||
    typeof body.name !== "string" ||
    typeof body.startDate !== "string" ||
    typeof body.endDate !== "string"
  ) {
    return errorResponse("BAD_REQUEST", "year, name, startDate, endDate は必須です", 400);
  }

  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return errorResponse("BAD_REQUEST", "startDate, endDate は有効な日付形式で指定してください", 400);
  }
  if (startDate > endDate) {
    return errorResponse("BAD_REQUEST", "startDate は endDate 以前の日付を指定してください", 400);
  }

  const existing = await prisma.fiscalYear.findUnique({ where: { year: body.year } });
  if (existing) return errorResponse("CONFLICT", "同じ年度がすでに存在します", 409);

  // 直近年度の fiscal_year_items をコピー
  const latestFy = await prisma.fiscalYear.findFirst({
    where: { year: { lt: body.year } },
    orderBy: { year: "desc" },
    select: { year: true },
  });

  const created = await prisma.$transaction(async (tx) => {
    const fy = await tx.fiscalYear.create({
      data: {
        year: body.year,
        name: body.name,
        startDate: startDate,
        endDate: endDate,
      },
      select: { year: true, name: true, startDate: true, endDate: true, isCurrent: true },
    });

    if (latestFy) {
      const sourceItems = await tx.fiscalYearItem.findMany({
        where: { fiscalYear: latestFy.year },
        select: { evaluationItemId: true },
      });
      if (sourceItems.length > 0) {
        await tx.fiscalYearItem.createMany({
          data: sourceItems.map((item) => ({
            fiscalYear: body.year,
            evaluationItemId: item.evaluationItemId,
          })),
        });
      }
    }

    return fy;
  });

  return successResponse(created, undefined, 201);
}
