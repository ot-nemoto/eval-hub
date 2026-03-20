import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "管理者のみアクセス可能です", 403);

  const items = await prisma.evaluationItem.findMany({
    orderBy: [{ target_no: "asc" }, { category_no: "asc" }, { item_no: "asc" }],
    select: {
      uid: true,
      target: true,
      target_no: true,
      category: true,
      category_no: true,
      item_no: true,
      name: true,
      description: true,
      eval_criteria: true,
      two_year_rule: true,
    },
  });

  return successResponse(items);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "管理者のみアクセス可能です", 403);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse("BAD_REQUEST", "リクエストボディが不正です", 400);

  const { uid, target, target_no, category, category_no, item_no, name, description, eval_criteria, two_year_rule } = body;

  if (!uid || typeof uid !== "string") return errorResponse("BAD_REQUEST", "uid は必須です", 400);
  if (!target || typeof target !== "string") return errorResponse("BAD_REQUEST", "target は必須です", 400);
  if (!category || typeof category !== "string") return errorResponse("BAD_REQUEST", "category は必須です", 400);
  if (!Number.isInteger(item_no)) return errorResponse("BAD_REQUEST", "item_no は整数で指定してください", 400);
  if (!name || typeof name !== "string") return errorResponse("BAD_REQUEST", "name は必須です", 400);

  const existing = await prisma.evaluationItem.findUnique({ where: { uid } });
  if (existing) return errorResponse("CONFLICT", "指定した UID はすでに存在します", 409);

  const item = await prisma.evaluationItem.create({
    data: {
      uid,
      target,
      target_no: Number.isInteger(target_no) ? target_no : null,
      category,
      category_no: Number.isInteger(category_no) ? category_no : null,
      item_no,
      name,
      description: typeof description === "string" ? description : null,
      eval_criteria: typeof eval_criteria === "string" ? eval_criteria : null,
      two_year_rule: two_year_rule === true,
    },
    select: { uid: true, target: true, target_no: true, category: true, category_no: true, item_no: true, name: true, description: true, eval_criteria: true, two_year_rule: true },
  });

  return successResponse(item, undefined, 201);
}
