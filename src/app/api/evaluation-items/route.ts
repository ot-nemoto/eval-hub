import { type NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  serializeEvaluationItem,
  statusForError,
  unauthorized,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { bulkReplaceEvaluationItems, getEvaluationItems } from "@/lib/evaluation-items";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { evaluationItemsImportBodySchema } from "@/lib/schemas/evaluation-item";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  try {
    const items = await getEvaluationItems();
    return NextResponse.json({ evaluationItems: items.map(serializeEvaluationItem) });
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "サーバーエラーが発生しました",
      statusForError(e),
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const body = await req.json().catch(() => null);
  const parsed = evaluationItemsImportBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const result = await bulkReplaceEvaluationItems(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "サーバーエラーが発生しました",
      statusForError(e),
    );
  }
}
