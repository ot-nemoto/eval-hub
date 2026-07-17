import { type NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorFromException, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { restoreEvalItemVersion } from "@/lib/eval-item-versions";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// 破壊的操作: 指定バージョンの内容で現在のマスタ（targets/categories/evaluation_items）を全消し→復元する。
export async function POST(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { id } = await params;
  const versionId = parseId(id);
  if (versionId === null) return jsonError("id は正の整数で指定してください", 400);

  // 現在マスタを全消しする不可逆操作のため、明示的な confirm=true を要求して誤爆を防ぐ。
  if (new URL(req.url).searchParams.get("confirm") !== "true")
    return jsonError("破壊的操作のため confirm=true を指定してください", 400);

  try {
    await restoreEvalItemVersion(versionId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
