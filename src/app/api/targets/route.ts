import { type NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  jsonErrorFromException,
  serializeTarget,
  unauthorized,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { targetCreateBodySchema } from "@/lib/schemas/target";
import { createTarget, getTargets } from "@/lib/targets";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  try {
    const targets = await getTargets();
    return NextResponse.json({ targets: targets.map(serializeTarget) });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const body = await req.json().catch(() => null);
  const parsed = targetCreateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const target = await createTarget(parsed.data);
    return NextResponse.json(serializeTarget(target), { status: 201 });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
