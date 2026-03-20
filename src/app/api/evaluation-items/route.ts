// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);

  const { searchParams } = new URL(request.url);
  const targetIdStr = searchParams.get("target_id");
  const categoryIdStr = searchParams.get("category_id");

  const where: { target_id?: number; category_id?: number } = {};
  if (targetIdStr !== null) {
    const targetId = Number(targetIdStr);
    if (!Number.isInteger(targetId) || targetId < 1) {
      return errorResponse("BAD_REQUEST", "target_id は正の整数で指定してください", 400);
    }
    where.target_id = targetId;
  }
  if (categoryIdStr !== null) {
    const categoryId = Number(categoryIdStr);
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      return errorResponse("BAD_REQUEST", "category_id は正の整数で指定してください", 400);
    }
    where.category_id = categoryId;
  }

  const items = await prisma.evaluationItem.findMany({
    where,
    orderBy: [{ target: { no: "asc" } }, { category: { no: "asc" } }, { no: "asc" }],
    select: {
      id: true,
      target_id: true,
      category_id: true,
      no: true,
      name: true,
      description: true,
      eval_criteria: true,
      target: { select: { id: true, name: true, no: true } },
      category: { select: { id: true, target_id: true, name: true, no: true } },
    },
  });

  return successResponse(items);
}
