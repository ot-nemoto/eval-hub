// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }
  if (session.user.role !== "admin") {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const { id } = await params;

  if (id === session.user.id) {
    return errorResponse("FORBIDDEN", "自分自身のロールは変更できません", 403);
  }

  const body = await request.json().catch(() => null);
  const validRole = body?.role === "admin" || body?.role === "member";
  const validIsActive = body?.is_active === true || body?.is_active === false;
  if (!body || (!validRole && !validIsActive)) {
    return errorResponse(
      "BAD_REQUEST",
      "role は 'admin' または 'member'、is_active は true または false で指定してください",
      400,
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return errorResponse("NOT_FOUND", "ユーザーが見つかりません", 404);
  }

  const data: { role?: "admin" | "member"; is_active?: boolean } = {};
  if (validRole) data.role = body.role;
  if (validIsActive) data.is_active = body.is_active;

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, is_active: true },
  });

  return successResponse(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }
  if (session.user.role !== "admin") {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const { id } = await params;

  if (id === session.user.id) {
    return errorResponse("FORBIDDEN", "自分自身は削除できません", 403);
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return errorResponse("NOT_FOUND", "ユーザーが見つかりません", 404);
  }

  // 関連データが存在する場合は削除不可
  const [assignmentCount, evaluationCount] = await Promise.all([
    prisma.evaluationAssignment.count({
      where: { OR: [{ evaluatee_id: id }, { evaluator_id: id }] },
    }),
    prisma.evaluation.count({ where: { evaluatee_id: id } }),
  ]);

  if (assignmentCount > 0 || evaluationCount > 0) {
    return errorResponse(
      "CONFLICT",
      "評価データまたはアサインデータが存在するため削除できません",
      409,
    );
  }

  await prisma.user.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
