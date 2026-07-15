import { type NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  jsonErrorFromException,
  serializeTarget,
  unauthorized,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { targetUpdateBodySchema } from "@/lib/schemas/target";
import { deleteTarget, updateTarget } from "@/lib/targets";

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
  const targetId = parseId(id);
  if (targetId === null) return jsonError("id は正の整数で指定してください", 400);

  const body = await req.json().catch(() => null);
  const parsed = targetUpdateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const target = await updateTarget(targetId, parsed.data);
    return NextResponse.json(serializeTarget(target));
  } catch (e) {
    return jsonErrorFromException(e);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { id } = await params;
  const targetId = parseId(id);
  if (targetId === null) return jsonError("id は正の整数で指定してください", 400);

  try {
    await deleteTarget(targetId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
