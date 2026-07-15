import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/login(.*)", "/auth-error"]);

// 外部連携用 REST API（Clerk ではなく API キー認証で保護）。CORS 対応の対象でもある。
const isApiRoute = createRouteMatcher(["/api/(.*)"]);

// API キー認証（Authorization ヘッダ）・Cookie 不使用のため、任意オリジン許可（*）で安全。
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

function withCors(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) res.headers.set(key, value);
  return res;
}

export default clerkMiddleware(async (auth, request) => {
  // 外部連携 API は CORS 対応。プリフライトは認証不要で 204 を返し、通常応答にも CORS を付与する。
  // 認証は各ルートの API キー検証に委ねる（Clerk 保護対象外）。
  if (isApiRoute(request)) {
    if (request.method === "OPTIONS") {
      return withCors(new NextResponse(null, { status: 204 }));
    }
    return withCors(NextResponse.next());
  }

  // 非本番環境: MOCK_USER_ID / MOCK_USER_EMAIL が設定されている場合はバイパス
  if (
    process.env.NODE_ENV !== "production" &&
    (process.env.MOCK_USER_ID || process.env.MOCK_USER_EMAIL)
  ) {
    return NextResponse.next();
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
