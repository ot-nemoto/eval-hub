import { type NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorFromException, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getEvaluations } from "@/lib/evaluations";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const params = new URL(req.url).searchParams;
  const evaluateeId = params.get("evaluateeId");
  if (!evaluateeId) return jsonError("evaluateeId は必須です", 400);
  const fiscalYearParam = params.get("fiscalYear");
  const fiscalYear = Number(fiscalYearParam);
  if (fiscalYearParam === null || !Number.isInteger(fiscalYear))
    return jsonError("fiscalYear は整数で指定してください", 400);

  try {
    const evaluations = await getEvaluations(evaluateeId, fiscalYear);
    return NextResponse.json({ evaluations });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
