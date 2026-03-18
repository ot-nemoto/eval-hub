// @vitest-environment node
import { getSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }
  if (session.user.role !== "admin") {
    return errorResponse("FORBIDDEN", "権限がありません", 403);
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      division: true,
      joined_at: true,
      created_at: true,
    },
    orderBy: { name: "asc" },
  });

  return successResponse(users);
}
