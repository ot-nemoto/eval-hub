import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }

  const { searchParams } = new URL(request.url);
  const targetIdStr = searchParams.get("targetId");
  const categoryIdStr = searchParams.get("categoryId");

  const where: { targetId?: number; categoryId?: number } = {};
  if (targetIdStr !== null) {
    const targetId = Number(targetIdStr);
    if (!Number.isInteger(targetId) || targetId < 1) {
      return errorResponse("BAD_REQUEST", "targetId は正の整数で指定してください", 400);
    }
    where.targetId = targetId;
  }
  if (categoryIdStr !== null) {
    const categoryId = Number(categoryIdStr);
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      return errorResponse("BAD_REQUEST", "categoryId は正の整数で指定してください", 400);
    }
    where.categoryId = categoryId;
  }

  const items = await prisma.evaluationItem.findMany({
    where,
    orderBy: [{ targetId: "asc" }, { categoryId: "asc" }, { no: "asc" }],
    select: {
      id: true,
      targetId: true,
      categoryId: true,
      no: true,
      name: true,
      description: true,
      evalCriteria: true,
      target: { select: { id: true, name: true, no: true } },
      category: { select: { id: true, targetId: true, name: true, no: true } },
    },
  });

  return successResponse(items);
}
