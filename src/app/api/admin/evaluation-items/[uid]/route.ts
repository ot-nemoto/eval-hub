import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ uid: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "管理者のみアクセス可能です", 403);

  const { uid } = await params;

  const existing = await prisma.evaluationItem.findUnique({ where: { uid } });
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
  if ("eval_criteria" in body) {
    if (body.eval_criteria !== null && typeof body.eval_criteria !== "string") return errorResponse("BAD_REQUEST", "eval_criteria の型が不正です", 400);
    data.eval_criteria = body.eval_criteria;
  }
  if ("two_year_rule" in body) {
    if (typeof body.two_year_rule !== "boolean") return errorResponse("BAD_REQUEST", "two_year_rule は真偽値で指定してください", 400);
    data.two_year_rule = body.two_year_rule;
  }

  if (Object.keys(data).length === 0) return errorResponse("BAD_REQUEST", "更新するフィールドを指定してください", 400);

  const item = await prisma.evaluationItem.update({
    where: { uid },
    data,
    select: { uid: true, target: true, target_no: true, category: true, category_no: true, item_no: true, name: true, description: true, eval_criteria: true, two_year_rule: true },
  });

  return successResponse(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "管理者のみアクセス可能です", 403);

  const { uid } = await params;

  const existing = await prisma.evaluationItem.findUnique({ where: { uid } });
  if (!existing) return errorResponse("NOT_FOUND", "評価項目が見つかりません", 404);

  const linked = await prisma.fiscalYearItem.count({ where: { evaluation_item_uid: uid } });
  if (linked > 0) return errorResponse("CONFLICT", "年度に紐づいているため削除できません", 409);

  await prisma.evaluationItem.delete({ where: { uid } });

  return new Response(null, { status: 204 });
}
