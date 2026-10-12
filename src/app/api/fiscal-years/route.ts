import { type NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  serializeFiscalYear,
  unauthorized,
  withApiErrorHandling,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { createFiscalYear, getFiscalYears } from "@/lib/fiscal-years";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { fiscalYearCreateBodySchema } from "@/lib/schemas/fiscal-year";

export const GET = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const fiscalYears = await getFiscalYears();
  return NextResponse.json({ fiscalYears: fiscalYears.map(serializeFiscalYear) });
});

export const POST = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const body = await req.json().catch(() => null);
  const parsed = fiscalYearCreateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const fy = await createFiscalYear(parsed.data);
  return NextResponse.json(serializeFiscalYear(fy), { status: 201 });
});
