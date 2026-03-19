// @vitest-environment node
import { getSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; year: string }> },
) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }
  if (session.user.role !== "admin") {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const { id, year } = await params;
  const fiscalYear = Number(year);
  if (Number.isNaN(fiscalYear)) {
    return errorResponse("BAD_REQUEST", "year は数値で指定してください", 400);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.self_evaluation_enabled !== "boolean") {
    return errorResponse("BAD_REQUEST", "self_evaluation_enabled は boolean で指定してください", 400);
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return errorResponse("NOT_FOUND", "ユーザーが見つかりません", 404);
  }

  const setting = await prisma.evaluationSetting.upsert({
    where: { user_id_fiscal_year: { user_id: id, fiscal_year: fiscalYear } },
    update: { self_evaluation_enabled: body.self_evaluation_enabled },
    create: { user_id: id, fiscal_year: fiscalYear, self_evaluation_enabled: body.self_evaluation_enabled },
  });

  return successResponse({
    fiscal_year: setting.fiscal_year,
    self_evaluation_enabled: setting.self_evaluation_enabled,
  });
}
