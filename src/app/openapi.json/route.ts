import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi/document";
import pkg from "../../../package.json";

// リクエストのオリジンを servers に反映するため静的化せず都度生成する。
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const doc = buildOpenApiDocument({
    version: pkg.version,
    serverUrl: new URL(req.url).origin,
  });
  return NextResponse.json(doc);
}
