import { type NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorFromException, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { reorderCategories } from "@/lib/categories";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { reorderBodySchema } from "@/lib/schemas/common";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const body = await req.json().catch(() => null);
  const parsed = reorderBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    await reorderCategories(parsed.data.orders);
    return new NextResponse(null, { status: 200 });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
