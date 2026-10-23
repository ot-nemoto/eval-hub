// @vitest-environment node
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NextRequest, type NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return {
    ...actual,
    // 分岐順（未知 API の 404 と mock バイパスの前後関係）を検証するため、
    // Clerk のセッション解決を挟まずハンドラだけを実行する
    clerkMiddleware:
      (handler: (auth: unknown, request: NextRequest) => unknown) => (request: NextRequest) =>
        handler({ protect: vi.fn() }, request),
  };
});

import middleware, { CORS_HEADERS, isApiRoute, isPublicRoute } from "./proxy";

const req = (path: string, method?: string) =>
  new NextRequest(`http://localhost:3000${path}`, method ? { method } : undefined);

/** 上の vi.mock により、default export は `(request) => Response` として呼べる。 */
const callMiddleware = middleware as unknown as (
  request: NextRequest,
) => Promise<NextResponse | undefined>;

const API_DIR = fileURLToPath(new URL("./app/api", import.meta.url));

/** Route Handler のファイル名（拡張子違いを取りこぼすと登録漏れを検出できない）。 */
const ROUTE_FILE = /^route\.(?:ts|tsx|js|jsx|mjs)$/;

/**
 * `src/app/api/**\/route.*` から実在する API ルートの URL パスを列挙する。
 * 手動列挙にすると新規ルートの `isApiRoute` 登録漏れを検出できないため、実装から導出する。
 * 動的セグメント（`[id]`）は具体値に置換し、URL に現れないルートグループ（`(group)`）は除去する。
 */
function collectApiRoutePaths(dir = API_DIR, prefix = "/api"): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // キャッチオール（[...unmatched]）は「どれにも一致しなかったものを受ける」側であり、
      // isApiRoute に一致させる対象ではない。下の検査から除くため収集しない。
      // 除外は catch-all セグメントに限定する（この検査は isApiRoute の登録漏れを
      // 検出する安全網なので、除外を広げると穴になる）。
      if (/^\[\.\.\..+\]$/.test(entry.name)) continue;
      const isRouteGroup = /^\(.+\)$/.test(entry.name);
      const segment = entry.name.replace(/^\[(?:\.\.\.)?.+\]$/, "abc");
      paths.push(
        ...collectApiRoutePaths(
          `${dir}/${entry.name}`,
          isRouteGroup ? prefix : `${prefix}/${segment}`,
        ),
      );
    } else if (ROUTE_FILE.test(entry.name)) {
      paths.push(prefix);
    }
  }
  return paths.sort();
}

const API_ROUTE_PATHS = collectApiRoutePaths();

/** CORS 対象外かつログイン必須であるべきパス（誤って公開すると仕様が漏れる）。 */
const PROTECTED_PATHS = ["/openapi.json", "/api-reference", "/"];

describe("isApiRoute（CORS 対象の外部連携 API）", () => {
  it("実在する全 API ルートに一致する（新規ルートの登録漏れを検出する）", () => {
    expect(API_ROUTE_PATHS.length).toBeGreaterThan(0);
    for (const path of API_ROUTE_PATHS) {
      expect(isApiRoute(req(path)), path).toBe(true);
    }
  });

  it("配信ルート・画面ルートには一致しない（ログイン必須を維持）", () => {
    for (const path of PROTECTED_PATHS) {
      expect(isApiRoute(req(path)), path).toBe(false);
    }
  });
});

describe("isPublicRoute（Clerk 保護の対象外）", () => {
  it("API ルートは公開扱いにしない（CORS 分岐が担当する）", () => {
    for (const path of API_ROUTE_PATHS) {
      expect(isPublicRoute(req(path)), path).toBe(false);
    }
  });

  it("配信ルート・画面ルートを公開扱いにしない", () => {
    for (const path of PROTECTED_PATHS) {
      expect(isPublicRoute(req(path)), path).toBe(false);
    }
  });
});

describe("middleware の分岐順", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("未知の API ルートは mock バイパス設定時も 404（ローカル検証と本番の挙動を揃える）", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("MOCK_USER_ID", "mock-user-id");

    const res = await callMiddleware(req("/api/unknown"));

    expect(res?.status).toBe(404);
    await expect(res?.json()).resolves.toEqual({ error: "Not Found" });
  });

  // NextAuth 時代の stub（/api/auth/[...nextauth]）は T224 で削除した。
  // isApiRoute に /api/auth(.*) を戻すと、ルートが無いまま素通りして
  // 列挙の痕跡が残らなくなるため、未登録パス扱いであることを固定する。
  it("削除済みの /api/auth は未登録パスとして JSON 404 を返す", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await callMiddleware(req("/api/auth/callback"));

    expect(res?.status).toBe(404);
    await expect(res?.json()).resolves.toEqual({ error: "Not Found" });
  });

  it("登録済み API ルートは mock バイパスに関係なく CORS を付けて通す", async () => {
    vi.stubEnv("MOCK_USER_ID", "mock-user-id");

    const res = await callMiddleware(req("/api/evaluations"));

    expect(res?.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("API ルートの OPTIONS は認証不要で 204 ＋ CORS を返す", async () => {
    const res = await callMiddleware(req("/api/evaluations", "OPTIONS"));

    expect(res?.status).toBe(204);
    expect(res?.headers.get("Access-Control-Allow-Methods")).toBe(
      CORS_HEADERS["Access-Control-Allow-Methods"],
    );
  });

  it("画面ルートは mock バイパスで素通りする（従来どおり）", async () => {
    vi.stubEnv("MOCK_USER_ID", "mock-user-id");

    const res = await callMiddleware(req("/"));

    expect(res?.status).toBe(200);
  });
});

// 未登録パスはハンドラに到達しないため withApiErrorHandling の記録が効かない。
// 連続アクセスはエンドポイント列挙の主要な痕跡なので、ここで残す必要がある。
describe("監査ログ（ハンドラに到達しない経路）", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未知の API ルートの 404 を記録する", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await callMiddleware(req("/api/unknown-endpoint"));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({
      type: "audit",
      method: "GET",
      path: "/api/unknown-endpoint",
      status: 404,
      userId: null,
    });
  });

  // CORS プリフライトは操作ではなく、登録済みパスなら常に 204 を返すだけで
  // 何も明かさない。件数だけ増えるため記録しない。
  it("OPTIONS のプリフライトは記録しない", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await callMiddleware(req("/api/evaluations", "OPTIONS"));

    expect(spy).not.toHaveBeenCalled();
  });

  it("登録済み API ルートは記録しない（ハンドラ側のラッパーが記録する）", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await callMiddleware(req("/api/evaluations"));

    expect(spy).not.toHaveBeenCalled();
  });

  it("画面ルートは記録しない（対象は外部 REST API のみ）", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await callMiddleware(req("/"));

    expect(spy).not.toHaveBeenCalled();
  });
});
