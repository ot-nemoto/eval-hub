// @vitest-environment node
import { errorResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ year: string; itemId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const { year: yearStr, itemId: itemIdStr } = await params;
  const year = Number(yearStr);
  if (!Number.isInteger(year))
    return errorResponse("BAD_REQUEST", "year は整数で指定してください", 400);

  const itemId = Number(itemIdStr);
  if (!Number.isInteger(itemId) || itemId < 1)
    return errorResponse("BAD_REQUEST", "itemId は正の整数で指定してください", 400);

  const existing = await prisma.fiscalYearItem.findUnique({
    where: { fiscalYear_evaluationItemId: { fiscalYear: year, evaluationItemId: itemId } },
  });
  if (!existing) return errorResponse("NOT_FOUND", "紐づきが見つかりません", 404);

  await prisma.fiscalYearItem.delete({
    where: { fiscalYear_evaluationItemId: { fiscalYear: year, evaluationItemId: itemId } },
  });

  return new Response(null, { status: 204 });
}
