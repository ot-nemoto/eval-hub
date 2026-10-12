import { type NextRequest, NextResponse } from "next/server";
import { jsonError, serializeTarget, unauthorized, withApiErrorHandling } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { targetCreateBodySchema } from "@/lib/schemas/target";
import { createTarget, getTargets } from "@/lib/targets";

export const GET = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const targets = await getTargets();
  return NextResponse.json({ targets: targets.map(serializeTarget) });
});

export const POST = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const body = await req.json().catch(() => null);
  const parsed = targetCreateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const target = await createTarget(parsed.data);
  return NextResponse.json(serializeTarget(target), { status: 201 });
});
