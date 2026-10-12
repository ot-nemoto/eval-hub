import { type NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  serializeCategory,
  unauthorized,
  withApiErrorHandling,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { createCategory, getCategories } from "@/lib/categories";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { categoryCreateBodySchema } from "@/lib/schemas/category";

export const GET = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const targetIdParam = new URL(req.url).searchParams.get("targetId");
  let targetId: number | undefined;
  if (targetIdParam !== null) {
    const n = Number(targetIdParam);
    if (!Number.isInteger(n) || n < 1)
      return jsonError("targetId は 1 以上の整数で指定してください", 400);
    targetId = n;
  }

  const categories = await getCategories(targetId);
  return NextResponse.json({ categories: categories.map(serializeCategory) });
});

export const POST = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const body = await req.json().catch(() => null);
  const parsed = categoryCreateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const category = await createCategory(parsed.data);
  return NextResponse.json(serializeCategory(category), { status: 201 });
});
