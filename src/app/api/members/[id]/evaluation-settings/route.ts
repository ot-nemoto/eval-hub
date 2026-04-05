// @vitest-environment node
import { getSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }

  const { id } = await params;
  const isAdmin = session.user.role === "admin";
  const isSelf = session.user.id === id;

  if (!isAdmin && !isSelf) {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return errorResponse("NOT_FOUND", "ユーザーが見つかりません", 404);
  }

  const settings = await prisma.evaluationSetting.findMany({
    where: { user_id: id },
    orderBy: { fiscal_year: "desc" },
  });

  return successResponse(
    settings.map((s) => ({
      fiscal_year: s.fiscal_year,
      self_evaluation_enabled: s.self_evaluation_enabled,
    })),
  );
}
