import { type NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  jsonErrorFromException,
  serializeFiscalYear,
  unauthorized,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { toggleFiscalYearLock } from "@/lib/fiscal-years";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { fiscalYearLockBodySchema } from "@/lib/schemas/fiscal-year";

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
  const parsed = fiscalYearLockBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const fy = await toggleFiscalYearLock(y, parsed.data.isLocked);
    return NextResponse.json(serializeFiscalYear(fy));
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
