// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const { searchParams } = new URL(request.url);
  const targetIdStr = searchParams.get("target_id");
  const where = targetIdStr ? { target_id: Number(targetIdStr) } : {};

  const categories = await prisma.category.findMany({
    where,
    orderBy: { no: "asc" },
    select: { id: true, target_id: true, name: true, no: true },
  });

  return successResponse(categories);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const body = await request.json().catch(() => null);
  if (
    !body ||
    !Number.isInteger(body.target_id) ||
    body.target_id < 1 ||
    typeof body.name !== "string" ||
    !Number.isInteger(body.no) ||
    body.no < 1
  ) {
    return errorResponse("BAD_REQUEST", "target_id, name, no は必須です", 400);
  }

  const target = await prisma.target.findUnique({ where: { id: body.target_id } });
  if (!target) return errorResponse("NOT_FOUND", "大分類が見つかりません", 404);

  const existing = await prisma.category.findUnique({
    where: { target_id_no: { target_id: body.target_id, no: body.no } },
  });
  if (existing) return errorResponse("CONFLICT", "同じ target_id と no の中分類がすでに存在します", 409);

  const created = await prisma.category.create({
    data: { target_id: body.target_id, name: body.name, no: body.no },
    select: { id: true, target_id: true, name: true, no: true },
  });

  return successResponse(created, undefined, 201);
}
