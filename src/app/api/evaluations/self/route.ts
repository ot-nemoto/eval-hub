import { type NextRequest, NextResponse } from "next/server";
import { jsonError, unauthorized, withApiErrorHandling } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getAllSelfEvaluations } from "@/lib/evaluations";

export const GET = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const params = new URL(req.url).searchParams;
  const fiscalYearParam = params.get("fiscalYear");
  const fiscalYear = Number(fiscalYearParam);
  if (fiscalYearParam === null || !Number.isInteger(fiscalYear))
    return jsonError("fiscalYear は整数で指定してください", 400);
  const userId = params.get("userId") ?? undefined;

  const selfEvaluations = await getAllSelfEvaluations(fiscalYear, { userId });
  return NextResponse.json({ selfEvaluations });
});
