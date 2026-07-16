import { type NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorFromException, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { upsertManagerScore } from "@/lib/evaluations";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { evaluationManagerScoreBodySchema } from "@/lib/schemas/evaluation";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const body = await req.json().catch(() => null);
  const parsed = evaluationManagerScoreBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const { evaluateeId, fiscalYear, evalItemVersionDetailId, managerScore } = parsed.data;

  try {
    const result = await upsertManagerScore(
      evaluateeId,
      fiscalYear,
      evalItemVersionDetailId,
      managerScore,
    );
    return NextResponse.json(result);
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
