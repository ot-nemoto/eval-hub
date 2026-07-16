import { type NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorFromException, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { createEvaluationAssignment, getEvaluationAssignments } from "@/lib/evaluation-assignments";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { evaluationAssignmentCreateBodySchema } from "@/lib/schemas/evaluation-assignment";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const params = new URL(req.url).searchParams;
  const fiscalYearParam = params.get("fiscalYear");
  let fiscalYear: number | undefined;
  if (fiscalYearParam !== null) {
    const n = Number(fiscalYearParam);
    if (!Number.isInteger(n)) return jsonError("fiscalYear は整数で指定してください", 400);
    fiscalYear = n;
  }
  const evaluateeId = params.get("evaluateeId") ?? undefined;

  try {
    const evaluationAssignments = await getEvaluationAssignments({ fiscalYear, evaluateeId });
    return NextResponse.json({ evaluationAssignments });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const body = await req.json().catch(() => null);
  const parsed = evaluationAssignmentCreateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const assignment = await createEvaluationAssignment(parsed.data);
    return NextResponse.json(assignment, { status: 201 });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
