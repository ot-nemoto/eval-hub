// @vitest-environment node
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const itemSelect = {
  uid: true,
  target_id: true,
  category_id: true,
  no: true,
  name: true,
  description: true,
  eval_criteria: true,
  target: { select: { id: true, name: true, no: true } },
  category: { select: { id: true, target_id: true, name: true, no: true } },
} as const;

export async function GET() {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "管理者のみアクセス可能です", 403);

  const items = await prisma.evaluationItem.findMany({
    orderBy: [{ target: { no: "asc" } }, { category: { no: "asc" } }, { no: "asc" }],
    select: itemSelect,
  });

  return successResponse(items);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  if (session.user.role !== "admin") return errorResponse("FORBIDDEN", "管理者のみアクセス可能です", 403);

  const body = await request.json().catch(() => null);
  if (
    !body ||
    !Number.isInteger(body.target_id) ||
    body.target_id < 1 ||
    !Number.isInteger(body.category_id) ||
    body.category_id < 1 ||
    typeof body.name !== "string" ||
    !body.name
  ) {
    return errorResponse("BAD_REQUEST", "target_id, category_id, name は必須です", 400);
  }

  const target = await prisma.target.findUnique({ where: { id: body.target_id } });
  if (!target) return errorResponse("NOT_FOUND", "大分類が見つかりません", 404);

  const category = await prisma.category.findUnique({ where: { id: body.category_id } });
  if (!category) return errorResponse("NOT_FOUND", "中分類が見つかりません", 404);

  if (category.target_id !== body.target_id) {
    return errorResponse("BAD_REQUEST", "category_id が target_id と一致しません", 400);
  }

  const maxItem = await prisma.evaluationItem.findFirst({
    where: { category_id: body.category_id },
    orderBy: { no: "desc" },
    select: { no: true },
  });
  const no = (maxItem?.no ?? 0) + 1;
  const uid = `${target.no}-${category.no}-${no}`;

  const item = await prisma.evaluationItem.create({
    data: {
      uid,
      target_id: body.target_id,
      category_id: body.category_id,
      no,
      name: body.name,
      description: typeof body.description === "string" ? body.description : null,
      eval_criteria: typeof body.eval_criteria === "string" ? body.eval_criteria : null,
    },
    select: itemSelect,
  });

  return successResponse(item, undefined, 201);
}
