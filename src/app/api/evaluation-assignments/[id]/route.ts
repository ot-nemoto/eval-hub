import { type NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorFromException, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { deleteEvaluationAssignment } from "@/lib/evaluation-assignments";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { id } = await params;

  try {
    await deleteEvaluationAssignment(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
