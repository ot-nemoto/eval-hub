// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) return errorResponse("BAD_REQUEST", "id は整数で指定してください", 400);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse("BAD_REQUEST", "リクエストボディが不正です", 400);

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return errorResponse("NOT_FOUND", "中分類が見つかりません", 404);

  const data: { name?: string; no?: number } = {};
  if (typeof body.name === "string") data.name = body.name;
  if (Number.isInteger(body.no) && body.no >= 1) data.no = body.no;

  if (Object.keys(data).length === 0)
    return errorResponse("BAD_REQUEST", "更新可能なフィールドが指定されていません", 400);

  if (data.no !== undefined && data.no !== category.no) {
    const conflict = await prisma.category.findUnique({
      where: { targetId_no: { targetId: category.targetId, no: data.no } },
    });
    if (conflict) return errorResponse("CONFLICT", "同じ target_id と no の中分類がすでに存在します", 409);
  }

  const updated = await prisma.category.update({
    where: { id },
    data,
    select: { id: true, targetId: true, name: true, no: true },
  });

  return successResponse(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "権限がありません", 403);

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) return errorResponse("BAD_REQUEST", "id は整数で指定してください", 400);

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return errorResponse("NOT_FOUND", "中分類が見つかりません", 404);

  const itemCount = await prisma.evaluationItem.count({ where: { categoryId: id } });
  if (itemCount > 0) return errorResponse("CONFLICT", "紐づく評価項目が存在するため削除できません", 409);

  await prisma.category.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
