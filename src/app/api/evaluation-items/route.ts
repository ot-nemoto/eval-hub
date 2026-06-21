import type { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

const itemSelect = {
  id: true,
  no: true,
  name: true,
  description: true,
  evalCriteria: true,
  target: { select: { id: true, no: true, name: true } },
  category: { select: { id: true, no: true, name: true } },
} as const;

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse("UNAUTHORIZED", "API キーが無効です", 401);
  if (user.role !== "ADMIN") return errorResponse("FORBIDDEN", "権限がありません", 403);

  try {
    const items = await prisma.evaluationItem.findMany({
      orderBy: [{ target: { no: "asc" } }, { category: { no: "asc" } }, { no: "asc" }],
      select: itemSelect,
    });
    return successResponse(items, { total: items.length });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "サーバーエラーが発生しました", 500);
  }
}

type ItemInput = {
  no: number;
  name: string;
  description?: string | null;
  evalCriteria?: string | null;
};

type CategoryInput = {
  no: number;
  name: string;
  items: ItemInput[];
};

type TargetInput = {
  no: number;
  name: string;
  categories: CategoryInput[];
};

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse("UNAUTHORIZED", "API キーが無効です", 401);
  if (user.role !== "ADMIN") return errorResponse("FORBIDDEN", "権限がありません", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("BAD_REQUEST", "リクエストボディが不正です", 400);
  }

  if (!Array.isArray(body) || body.length === 0) {
    return errorResponse("BAD_REQUEST", "大項目の配列を指定してください", 400);
  }

  for (const t of body as TargetInput[]) {
    if (!Number.isInteger(t.no) || t.no < 1 || typeof t.name !== "string" || !t.name.trim()) {
      return errorResponse(
        "BAD_REQUEST",
        "大項目に no（1以上の整数）と name（文字列）は必須です",
        400,
      );
    }
    if (!Array.isArray(t.categories)) {
      return errorResponse("BAD_REQUEST", "大項目に categories 配列は必須です", 400);
    }
    for (const c of t.categories) {
      if (!Number.isInteger(c.no) || c.no < 1 || typeof c.name !== "string" || !c.name.trim()) {
        return errorResponse(
          "BAD_REQUEST",
          "中項目に no（1以上の整数）と name（文字列）は必須です",
          400,
        );
      }
      if (!Array.isArray(c.items)) {
        return errorResponse("BAD_REQUEST", "中項目に items 配列は必須です", 400);
      }
      for (const item of c.items) {
        if (
          !Number.isInteger(item.no) ||
          item.no < 1 ||
          typeof item.name !== "string" ||
          !item.name.trim()
        ) {
          return errorResponse(
            "BAD_REQUEST",
            "評価項目に no（1以上の整数）と name（文字列）は必須です",
            400,
          );
        }
      }
    }
  }

  let created: { targetNo: number; categoryNo: number; itemNo: number; name: string }[] = [];

  try {
    created = await prisma.$transaction(async (tx) => {
      const result: typeof created = [];

      // 全削除（FK順: 評価項目→中分類→大分類）
      await tx.evaluationItem.deleteMany({});
      await tx.category.deleteMany({});
      await tx.target.deleteMany({});

      // 再挿入（大分類→中分類→評価項目）
      for (const targetInput of body as TargetInput[]) {
        const target = await tx.target.create({
          data: { no: targetInput.no, name: targetInput.name },
        });

        for (const categoryInput of targetInput.categories) {
          const category = await tx.category.create({
            data: { targetId: target.id, no: categoryInput.no, name: categoryInput.name },
          });

          for (const itemInput of categoryInput.items) {
            await tx.evaluationItem.create({
              data: {
                targetId: target.id,
                categoryId: category.id,
                no: itemInput.no,
                name: itemInput.name,
                description: itemInput.description ?? null,
                evalCriteria: itemInput.evalCriteria ?? null,
              },
            });
            result.push({
              targetNo: target.no,
              categoryNo: category.no,
              itemNo: itemInput.no,
              name: itemInput.name,
            });
          }
        }
      }

      return result;
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "サーバーエラーが発生しました", 500);
  }

  return successResponse({ created: created.length }, { items: created }, 200);
}
