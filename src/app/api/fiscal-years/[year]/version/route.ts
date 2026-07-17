import { type NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorFromException, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { assignVersionToFiscalYear, unassignVersionFromFiscalYear } from "@/lib/eval-item-versions";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { versionAssignBodySchema } from "@/lib/schemas/eval-item-version";

type RouteContext = { params: Promise<{ year: string }> };

function parseYear(year: string): number | null {
  const n = Number(year);
  return Number.isInteger(n) ? n : null;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { year } = await params;
  const y = parseYear(year);
  if (y === null) return jsonError("year は整数で指定してください", 400);

  const body = await req.json().catch(() => null);
  const parsed = versionAssignBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const result = await assignVersionToFiscalYear(y, parsed.data.versionId);
    return NextResponse.json(result);
  } catch (e) {
    return jsonErrorFromException(e);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { year } = await params;
  const y = parseYear(year);
  if (y === null) return jsonError("year は整数で指定してください", 400);

  try {
    await unassignVersionFromFiscalYear(y);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
