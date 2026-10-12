import { type NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  serializeFiscalYear,
  unauthorized,
  withApiErrorHandling,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { deleteFiscalYear, updateFiscalYear } from "@/lib/fiscal-years";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { fiscalYearUpdateBodySchema } from "@/lib/schemas/fiscal-year";

type RouteContext = { params: Promise<{ year: string }> };

function parseYear(year: string): number | null {
  const n = Number(year);
  return Number.isInteger(n) ? n : null;
}

export const PATCH = withApiErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { year } = await params;
  const y = parseYear(year);
  if (y === null) return jsonError("year は整数で指定してください", 400);

  const body = await req.json().catch(() => null);
  const parsed = fiscalYearUpdateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const fy = await updateFiscalYear(y, parsed.data);
  return NextResponse.json(serializeFiscalYear(fy));
});

export const DELETE = withApiErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const { year } = await params;
  const y = parseYear(year);
  if (y === null) return jsonError("year は整数で指定してください", 400);

  await deleteFiscalYear(y);
  return new NextResponse(null, { status: 204 });
});
