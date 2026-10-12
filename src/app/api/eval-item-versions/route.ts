import { type NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  serializeEvalItemVersion,
  unauthorized,
  withApiErrorHandling,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { createEvalItemVersion, getEvalItemVersions } from "@/lib/eval-item-versions";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { evalItemVersionCreateBodySchema } from "@/lib/schemas/eval-item-version";

export const GET = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const versions = await getEvalItemVersions();
  return NextResponse.json({ evalItemVersions: versions.map(serializeEvalItemVersion) });
});

export const POST = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const body = await req.json().catch(() => null);
  const parsed = evalItemVersionCreateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const version = await createEvalItemVersion(parsed.data.name);
  return NextResponse.json(version, { status: 201 });
});
