import { getSession } from "@/lib/auth";
import { errorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }
  if (session.user.role !== "ADMIN") {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const { id } = await params;

  const existing = await prisma.evaluationAssignment.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "アサインが見つかりません", 404);
  }

  await prisma.evaluationAssignment.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
