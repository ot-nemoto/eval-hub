import { type NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorFromException, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getEvaluationMatrix } from "@/lib/evaluations";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const fiscalYearParam = new URL(req.url).searchParams.get("fiscalYear");
  const fiscalYear = Number(fiscalYearParam);
  if (fiscalYearParam === null || !Number.isInteger(fiscalYear))
    return jsonError("fiscalYear は整数で指定してください", 400);

  try {
    return NextResponse.json(await getEvaluationMatrix(fiscalYear));
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
