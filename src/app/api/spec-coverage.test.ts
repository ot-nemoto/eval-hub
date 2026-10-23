// @vitest-environment node
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { buildOpenApiDocument } from "@/lib/openapi/document";

// ルートモジュールの import 時に実 DB へ触れないようにする（`@/lib/prisma` は DATABASE_URL 未設定で throw する）
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

/**
 * 配信 spec の `paths` と、実在する API ルートの対応を固定する。
 *
 * `document.test.ts` の `EXPECTED_PATHS` は spec 同士（spec の paths ↔ 手書きの表）を
 * 比べているだけなので、**ルートを足して spec に書かない**と素通りする。
 * 「配信 spec を仕様の唯一の正とする」原則は、spec に載っていない操作が存在しないことまで
 * 含むため、検査対象の収集を列挙にせずファイルシステムから導出する
 * （`.claude/api-rules.md`「検査対象のルートの収集も列挙にしない」）。
 *
 * メソッドは**モジュールを実際に読み込んで export を見る**（`route-wrapping.test.ts` と同じ理由。
 * ソースの文字列マッチは想定した書き方の列挙になり、列挙漏れが素通りする）。
 */
const HTTP_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"] as const;

const API_DIR = join(process.cwd(), "src/app/api");
const ROUTE_FILE = /^route\.(?:ts|tsx|js|jsx|mts|mjs)$/;

/**
 * `src/app/api/**\/route.*` を OpenAPI のパス表記に変換して列挙する。
 * 動的セグメント（`[id]`）は `{id}` に、URL に現れないルートグループ（`(group)`）は除去する。
 * キャッチオール（`[...unmatched]`）は「どれにも一致しなかったものを受ける」側で spec の対象外。
 */
function collectRoutes(dir = API_DIR, prefix = "/api"): { path: string; file: string }[] {
  const found: { path: string; file: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (/^\[\.\.\..+\]$/.test(entry.name)) continue;
      const isRouteGroup = /^\(.+\)$/.test(entry.name);
      const segment = entry.name.replace(/^\[(.+)\]$/, "{$1}");
      found.push(...collectRoutes(full, isRouteGroup ? prefix : `${prefix}/${segment}`));
    } else if (ROUTE_FILE.test(entry.name)) {
      found.push({ path: prefix, file: full });
    }
  }
  return found;
}

describe("配信 spec と実ルートの対応", () => {
  // 全ルートモジュールを動的 import するため既定の 5 秒では足りない
  it("spec の operation 集合が実ルートの export と一致する", { timeout: 30_000 }, async () => {
    const routes = collectRoutes();
    // 走査の起点を誤ると 1 件も検査せずに通るため、0 件での成功を禁じる。
    expect(routes.length).toBeGreaterThan(0);

    const modules = await Promise.allSettled(routes.map((r) => import(r.file)));

    const failures: string[] = [];
    const fromRoutes = new Set<string>();
    for (const [i, result] of modules.entries()) {
      const { path, file } = routes[i];
      if (result.status === "rejected") {
        // 読み込み時に実 DB・外部サービスへ触れるモジュールを引き込んだ場合など。必要なら vi.mock を足す
        failures.push(
          `${relative(process.cwd(), file)}: 読み込みに失敗 (${String(result.reason)})`,
        );
        continue;
      }
      const mod = result.value as Record<string, unknown>;
      for (const method of HTTP_METHODS) {
        if (mod[method] !== undefined) fromRoutes.add(`${method} ${path}`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);

    const doc = buildOpenApiDocument();
    const fromSpec = new Set<string>();
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const method of Object.keys(item as Record<string, unknown>)) {
        const upper = method.toUpperCase();
        if ((HTTP_METHODS as readonly string[]).includes(upper)) fromSpec.add(`${upper} ${path}`);
      }
    }

    // 双方向で比べる。実ルートにあって spec に無いものは仕様の欠落、
    // spec にあって実ルートに無いものは spec の嘘（どちらも「唯一の正」を崩す）。
    expect([...fromSpec].sort()).toEqual([...fromRoutes].sort());
  });
});
