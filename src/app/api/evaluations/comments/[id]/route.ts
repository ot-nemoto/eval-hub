import { type NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorFromException, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { deleteManagerComment, updateManagerComment } from "@/lib/evaluations";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { evaluationCommentUpdateBodySchema } from "@/lib/schemas/evaluation";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = evaluationCommentUpdateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const comment = await updateManagerComment(id, parsed.data);
    return NextResponse.json(comment);
  } catch (e) {
    return jsonErrorFromException(e);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { id } = await params;

  try {
    await deleteManagerComment(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
