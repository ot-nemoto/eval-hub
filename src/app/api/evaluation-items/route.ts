import { type NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  jsonErrorFromException,
  serializeEvaluationItem,
  unauthorized,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { createEvaluationItem, getEvaluationItems } from "@/lib/evaluation-items";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { evaluationItemCreateBodySchema } from "@/lib/schemas/evaluation-item";

function parsePositiveInt(value: string | null): number | undefined | null {
  if (value === null) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const params = new URL(req.url).searchParams;
  const targetId = parsePositiveInt(params.get("targetId"));
  if (targetId === null) return jsonError("targetId は 1 以上の整数で指定してください", 400);
  const categoryId = parsePositiveInt(params.get("categoryId"));
  if (categoryId === null) return jsonError("categoryId は 1 以上の整数で指定してください", 400);

  try {
    const items = await getEvaluationItems({ targetId, categoryId });
    return NextResponse.json({ evaluationItems: items.map(serializeEvaluationItem) });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const body = await req.json().catch(() => null);
  const parsed = evaluationItemCreateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const item = await createEvaluationItem(parsed.data);
    return NextResponse.json(serializeEvaluationItem(item), { status: 201 });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
