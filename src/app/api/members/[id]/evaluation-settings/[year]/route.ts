// @vitest-environment node

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; year: string }> },
) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }
  if (session.user.role !== "ADMIN") {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const { id, year } = await params;
  const fiscalYear = Number(year);
  if (Number.isNaN(fiscalYear)) {
    return errorResponse("BAD_REQUEST", "year は数値で指定してください", 400);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.selfEvaluationEnabled !== "boolean") {
    return errorResponse("BAD_REQUEST", "selfEvaluationEnabled は boolean で指定してください", 400);
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return errorResponse("NOT_FOUND", "ユーザーが見つかりません", 404);
  }

  const setting = await prisma.evaluationSetting.upsert({
    where: { userId_fiscalYear: { userId: id, fiscalYear: fiscalYear } },
    update: { selfEvaluationEnabled: body.selfEvaluationEnabled },
    create: {
      userId: id,
      fiscalYear: fiscalYear,
      selfEvaluationEnabled: body.selfEvaluationEnabled,
    },
  });

  return successResponse({
    fiscalYear: setting.fiscalYear,
    selfEvaluationEnabled: setting.selfEvaluationEnabled,
  });
}
