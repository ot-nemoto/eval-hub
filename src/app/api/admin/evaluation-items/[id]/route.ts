import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "管理者のみアクセス可能です", 403);

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id < 1)
    return errorResponse("BAD_REQUEST", "id は正の整数で指定してください", 400);

  const existing = await prisma.evaluationItem.findUnique({ where: { id } });
  if (!existing) return errorResponse("NOT_FOUND", "評価項目が見つかりません", 404);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse("BAD_REQUEST", "リクエストボディが不正です", 400);

  const data: Record<string, unknown> = {};
  if ("name" in body) {
    if (typeof body.name !== "string" || !body.name) return errorResponse("BAD_REQUEST", "name は空にできません", 400);
    data.name = body.name;
  }
  if ("description" in body) {
    if (body.description !== null && typeof body.description !== "string") return errorResponse("BAD_REQUEST", "description の型が不正です", 400);
    data.description = body.description;
  }
  if ("evalCriteria" in body) {
    if (body.evalCriteria !== null && typeof body.evalCriteria !== "string") return errorResponse("BAD_REQUEST", "evalCriteria の型が不正です", 400);
    data.evalCriteria = body.evalCriteria;
  }
  if (Object.keys(data).length === 0) return errorResponse("BAD_REQUEST", "更新するフィールドを指定してください", 400);

  const item = await prisma.evaluationItem.update({
    where: { id },
    data,
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

  return successResponse(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "管理者のみアクセス可能です", 403);

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id < 1)
    return errorResponse("BAD_REQUEST", "id は正の整数で指定してください", 400);

  const existing = await prisma.evaluationItem.findUnique({ where: { id } });
  if (!existing) return errorResponse("NOT_FOUND", "評価項目が見つかりません", 404);

  const linked = await prisma.fiscalYearItem.count({ where: { evaluationItemId: id } });
  if (linked > 0) return errorResponse("CONFLICT", "年度に紐づいているため削除できません", 409);

  await prisma.evaluationItem.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
