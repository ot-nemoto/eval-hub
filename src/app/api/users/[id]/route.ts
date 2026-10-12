import { type NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  serializeUserUpdate,
  unauthorized,
  withApiErrorHandling,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { userUpdateBodySchema } from "@/lib/schemas/user";
import { deleteUser, updateUser } from "@/lib/users";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withApiErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = userUpdateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const updated = await updateUser(id, parsed.data, user.id);
  return NextResponse.json(serializeUserUpdate(updated));
});

export const DELETE = withApiErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { id } = await params;

  await deleteUser(id, user.id);
  return new NextResponse(null, { status: 204 });
});
