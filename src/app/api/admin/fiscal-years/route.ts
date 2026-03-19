// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const fiscalYears = await prisma.fiscalYear.findMany({
    orderBy: { year: "desc" },
    select: { year: true, name: true, start_date: true, end_date: true, is_current: true },
  });

  return successResponse(fiscalYears);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.year !== "number" ||
    typeof body.name !== "string" ||
    typeof body.start_date !== "string" ||
    typeof body.end_date !== "string"
  ) {
    return errorResponse("BAD_REQUEST", "year, name, start_date, end_date は必須です", 400);
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
        start_date: new Date(body.start_date),
        end_date: new Date(body.end_date),
      },
      select: { year: true, name: true, start_date: true, end_date: true, is_current: true },
    });

    if (latestFy) {
      const sourceItems = await tx.fiscalYearItem.findMany({
        where: { fiscal_year: latestFy.year },
        select: { evaluation_item_uid: true },
      });
      if (sourceItems.length > 0) {
        await tx.fiscalYearItem.createMany({
          data: sourceItems.map((item) => ({
            fiscal_year: body.year,
            evaluation_item_uid: item.evaluation_item_uid,
          })),
        });
      }
    }

    return fy;
  });

  return successResponse(created, undefined, 201);
}
