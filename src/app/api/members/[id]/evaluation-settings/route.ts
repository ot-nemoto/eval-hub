// @vitest-environment node

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }

  const { id } = await params;
  const isAdmin = session.user.role === "ADMIN";
  const isSelf = session.user.id === id;

  if (!isAdmin && !isSelf) {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return errorResponse("NOT_FOUND", "ユーザーが見つかりません", 404);
  }

  const settings = await prisma.evaluationSetting.findMany({
    where: { userId: id },
    orderBy: { fiscalYear: "desc" },
  });

  return successResponse(
    settings.map((s) => ({
      fiscalYear: s.fiscalYear,
      selfEvaluationEnabled: s.selfEvaluationEnabled,
    })),
  );
}
