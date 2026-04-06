// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const itemSelect = {
  id: true,
  targetId: true,
  categoryId: true,
  no: true,
  name: true,
  description: true,
  evalCriteria: true,
  target: { select: { id: true, name: true, no: true } },
  category: { select: { id: true, targetId: true, name: true, no: true } },
} as const;

export async function GET() {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "管理者のみアクセス可能です", 403);

  const items = await prisma.evaluationItem.findMany({
    orderBy: [{ target: { no: "asc" } }, { category: { no: "asc" } }, { no: "asc" }],
    select: itemSelect,
  });

  return successResponse(items);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "管理者のみアクセス可能です", 403);

  const body = await request.json().catch(() => null);
  if (
    !body ||
    !Number.isInteger(body.targetId) ||
    body.targetId < 1 ||
    !Number.isInteger(body.categoryId) ||
    body.categoryId < 1 ||
    typeof body.name !== "string" ||
    !body.name
  ) {
    return errorResponse("BAD_REQUEST", "targetId, categoryId, name は必須です", 400);
  }

  const target = await prisma.target.findUnique({ where: { id: body.targetId } });
  if (!target) return errorResponse("NOT_FOUND", "大分類が見つかりません", 404);

  const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
  if (!category) return errorResponse("NOT_FOUND", "中分類が見つかりません", 404);

  if (category.targetId !== body.targetId) {
    return errorResponse("BAD_REQUEST", "categoryId が targetId と一致しません", 400);
  }

  const maxItem = await prisma.evaluationItem.findFirst({
    where: { categoryId: body.categoryId },
    orderBy: { no: "desc" },
    select: { no: true },
  });
  const no = (maxItem?.no ?? 0) + 1;

  const item = await prisma.evaluationItem.create({
    data: {
      targetId: body.targetId,
      categoryId: body.categoryId,
      no,
      name: body.name,
      description: typeof body.description === "string" ? body.description : null,
      evalCriteria: typeof body.evalCriteria === "string" ? body.evalCriteria : null,
    },
    select: itemSelect,
  });

  return successResponse(item, undefined, 201);
}
