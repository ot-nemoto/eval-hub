import { NextResponse } from "next/server";

type Meta = {
  total?: number;
  page?: number;
  [key: string]: unknown;
};

type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_SERVER_ERROR";

export function successResponse<T>(data: T, meta?: Meta, status = 200) {
  const body: { data: T; meta?: Meta } = { data };
  if (meta !== undefined) body.meta = meta;
  return NextResponse.json(body, { status });
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
) {
  return NextResponse.json({ error: { code, message } }, { status });
}
