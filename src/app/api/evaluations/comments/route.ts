import { type NextRequest, NextResponse } from "next/server";
import { jsonError, unauthorized, withApiErrorHandling } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { addManagerComment } from "@/lib/evaluations";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { evaluationCommentCreateBodySchema } from "@/lib/schemas/evaluation";

export const POST = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const body = await req.json().catch(() => null);
  const parsed = evaluationCommentCreateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const { evaluateeId, fiscalYear, evalItemVersionDetailId, evaluatorId, reason } = parsed.data;

  const comment = await addManagerComment(
    evaluateeId,
    fiscalYear,
    evalItemVersionDetailId,
    evaluatorId,
    { reason },
  );
  return NextResponse.json(comment, { status: 201 });
});
