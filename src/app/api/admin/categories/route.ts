// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const { searchParams } = new URL(request.url);
  const targetIdStr = searchParams.get("targetId");
  let where: { targetId?: number } = {};
  if (targetIdStr !== null) {
    const targetId = Number(targetIdStr);
    if (!Number.isInteger(targetId) || targetId < 1) {
      return errorResponse("BAD_REQUEST", "targetId は正の整数で指定してください", 400);
    }
    where = { targetId: targetId };
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: { no: "asc" },
    select: { id: true, targetId: true, name: true, no: true },
  });

  return successResponse(categories);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const body = await request.json().catch(() => null);
  if (
    !body ||
    !Number.isInteger(body.targetId) ||
    body.targetId < 1 ||
    typeof body.name !== "string" ||
    !body.name ||
    !Number.isInteger(body.no) ||
    body.no < 1
  ) {
    return errorResponse("BAD_REQUEST", "targetId, name, no は必須です", 400);
  }

  const target = await prisma.target.findUnique({ where: { id: body.targetId } });
  if (!target) return errorResponse("NOT_FOUND", "大分類が見つかりません", 404);

  const existing = await prisma.category.findUnique({
    where: { targetId_no: { targetId: body.targetId, no: body.no } },
  });
  if (existing)
    return errorResponse("CONFLICT", "同じ targetId と no の中分類がすでに存在します", 409);

  const created = await prisma.category.create({
    data: { targetId: body.targetId, name: body.name, no: body.no },
    select: { id: true, targetId: true, name: true, no: true },
  });

  return successResponse(created, undefined, 201);
}
