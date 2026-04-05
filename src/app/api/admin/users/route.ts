// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }
  if (session.user.role !== "ADMIN") {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      division: true,
      joinedAt: true,
      createdAt: true,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  return successResponse(users);
}
