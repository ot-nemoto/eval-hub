// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const targets = await prisma.target.findMany({
    orderBy: { no: "asc" },
    select: { id: true, name: true, no: true },
  });

  return successResponse(targets);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    !body.name ||
    !Number.isInteger(body.no) ||
    body.no < 1
  ) {
    return errorResponse("BAD_REQUEST", "name, no は必須です", 400);
  }

  const existing = await prisma.target.findUnique({ where: { no: body.no } });
  if (existing) return errorResponse("CONFLICT", "同じ no の大分類がすでに存在します", 409);

  const created = await prisma.target.create({
    data: { name: body.name, no: body.no },
    select: { id: true, name: true, no: true },
  });

  return successResponse(created, undefined, 201);
}
