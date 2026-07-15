import { type NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  jsonErrorFromException,
  serializeEvaluationItem,
  unauthorized,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { deleteEvaluationItem, updateEvaluationItem } from "@/lib/evaluation-items";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { evaluationItemUpdateBodySchema } from "@/lib/schemas/evaluation-item";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { id } = await params;
  const itemId = parseId(id);
  if (itemId === null) return jsonError("id は正の整数で指定してください", 400);

  const body = await req.json().catch(() => null);
  const parsed = evaluationItemUpdateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const item = await updateEvaluationItem(itemId, parsed.data);
    return NextResponse.json(serializeEvaluationItem(item));
  } catch (e) {
    return jsonErrorFromException(e);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { id } = await params;
  const itemId = parseId(id);
  if (itemId === null) return jsonError("id は正の整数で指定してください", 400);

  try {
    await deleteEvaluationItem(itemId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
