import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logAudit } from "@/lib/auditLog";

// どのパスが「公開」「CORS 対象の外部 API」かを決める分類はこのファイルの急所であり、
// 誤ると静かに認証を無効化しうる。回帰防止のため export して proxy.test.ts で固定する。
export const isPublicRoute = createRouteMatcher(["/login(.*)", "/auth-error"]);

// 外部連携用 REST API（Clerk ではなく API キー認証で保護）。CORS 対応の対象でもある。
// 個別列挙にするのは、未登録の /api/* を下の 404 分岐で捕まえるため。
// /api/(.*) の総覧一致だと未登録パスも素通りし、列挙の痕跡が残らない。
// 登録漏れは proxy.test.ts が実ルートの列挙と突き合わせて検出する。
export const isApiRoute = createRouteMatcher([
  "/api/categories(.*)",
  "/api/eval-item-versions(.*)",
  "/api/evaluation-assignments(.*)",
  "/api/evaluation-items(.*)",
  "/api/evaluation-settings(.*)",
  "/api/evaluations(.*)",
  "/api/fiscal-years(.*)",
  "/api/targets(.*)",
  "/api/users(.*)",
]);

// API キー認証（Authorization ヘッダ）・Cookie 不使用のため、任意オリジン許可（*）で安全。
export const CORS_HEADERS: Record<string, string> = {
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

  // 未知の API ルートは JSON 404 を返す（画面はリダイレクト）。
  // mock バイパスより前に評価する: 後段に置くと MOCK_USER_ID 設定時に isApiRoute 未登録の
  // /api/* が素通りしてハンドラに到達し、ローカルの curl 検証が本番挙動と乖離するため。
  //
  // ここはハンドラに到達しないため withApiErrorHandling の記録が効かない。
  // 未登録パスへの連続アクセスはエンドポイント列挙の主要な痕跡なので、ここで残す。
  // userId は null になる（IP で追う）。proxy.ts は Next 16 では Node.js ランタイムで
  // 動くため DB は引けるが、未認証の総当たりに DB クエリを与えたくないので引かない。
  if (!isPublicRoute(request) && request.nextUrl.pathname.startsWith("/api/")) {
    logAudit(request, 404);
    // 他の API 応答と同様に CORS を付ける。付けないとブラウザからは
    // 不透明なエラーになり、{ error } の本文が読めない。
    return withCors(NextResponse.json({ error: "Not Found" }, { status: 404 }));
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
