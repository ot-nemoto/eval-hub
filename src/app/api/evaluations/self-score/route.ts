import { type NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorFromException, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { upsertEvaluation } from "@/lib/evaluations";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { evaluationSelfUpsertBodySchema } from "@/lib/schemas/evaluation";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const body = await req.json().catch(() => null);
  const parsed = evaluationSelfUpsertBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const result = await upsertEvaluation(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
