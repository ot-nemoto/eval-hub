import { auth } from "@/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target") ?? undefined;
  const category = searchParams.get("category") ?? undefined;

  const items = await prisma.evaluationItem.findMany({
    where: {
      ...(target ? { target } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: [{ target_no: "asc" }, { category_no: "asc" }, { item_no: "asc" }],
    select: {
      uid: true,
      target: true,
      category: true,
      name: true,
      description: true,
      eval_criteria: true,
      two_year_rule: true,
    },
  });

  return successResponse(items);
}
