import { type NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorFromException, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getCurrentEvalItems } from "@/lib/eval-item-versions";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  try {
    const currentEvalItems = await getCurrentEvalItems();
    return NextResponse.json({ currentEvalItems });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
