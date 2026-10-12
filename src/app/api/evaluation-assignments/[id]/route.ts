import { type NextRequest, NextResponse } from "next/server";
import { jsonError, unauthorized, withApiErrorHandling } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { deleteEvaluationAssignment } from "@/lib/evaluation-assignments";

type RouteContext = { params: Promise<{ id: string }> };

export const DELETE = withApiErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { id } = await params;

  await deleteEvaluationAssignment(id);
  return new NextResponse(null, { status: 204 });
});
