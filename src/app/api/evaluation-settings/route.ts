import { type NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorFromException, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getEvaluationSettings, upsertEvaluationSetting } from "@/lib/evaluation-settings";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { evaluationSettingUpsertBodySchema } from "@/lib/schemas/evaluation-setting";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return jsonError("userId は必須です", 400);

  try {
    const evaluationSettings = await getEvaluationSettings(userId);
    return NextResponse.json({ evaluationSettings });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const body = await req.json().catch(() => null);
  const parsed = evaluationSettingUpsertBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const setting = await upsertEvaluationSetting(parsed.data.userId, parsed.data.fiscalYear, {
      selfEvaluationEnabled: parsed.data.selfEvaluationEnabled,
    });
    return NextResponse.json(setting);
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
