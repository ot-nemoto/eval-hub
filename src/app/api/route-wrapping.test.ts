// @vitest-environment node
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { WRAPPED } from "@/lib/api-response";

// ルートモジュールの import 時に実 DB へ触れないようにする（`@/lib/prisma` は DATABASE_URL 未設定で throw する）
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

/**
 * 全 API ルートのハンドラが withApiErrorHandling で包まれていることを固定する。
 *
 * 捕捉されない例外を `{ error }` レスポンスに変換する責務はラッパーにあり、包み忘れると
 * そのルートだけ Next.js 既定の 500（spec が定める `{ error }` 形式でない）に戻る。
 * ルート追加のたびに人が気づく必要がないよう、構造として検査する。
 *
 * **判定はソースの文字列マッチではなく、モジュールを実際に読み込んで印を見る。**
 * 文字列で「包まれている形」を探す作りは、想定した書き方を列挙することになり、
 * 列挙から漏れた形が素通りする。daily-hub では同じ理由で 3 回穴が見つかった
 * （`export function GET(` / `route.tsx` / `export * from "./handlers"`）。
 * 実体で判定すれば、どの書き方で export されても結果は変わらない。
 *
 * 検査対象は `src/app/api/` 配下のみ。`/openapi.json`・`/api-reference` は
 * 外部 API の契約（`{ error }`）の対象外で、JSON エラーを返すのが適切ではない。
 */
const HTTP_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"] as const;

const API_DIR = join(process.cwd(), "src/app/api");

/** 配下のルートファイルをすべて列挙する（追加ライブラリに依存しない） */
function findRouteFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findRouteFiles(path);
    return /^route\.(?:ts|tsx|js|jsx|mts|mjs)$/.test(entry.name) ? [path] : [];
  });
}

describe("API ルートのエラーハンドリング", () => {
  // 全ルートモジュールを動的 import するため既定の 5 秒では足りない
  it("全ハンドラが withApiErrorHandling で包まれている", { timeout: 30_000 }, async () => {
    const files = findRouteFiles(API_DIR);
    expect(files.length).toBeGreaterThan(0);

    // 並列に読み込み、1 ファイルの読み込み失敗で残りの検査が止まらないようにする
    const results = await Promise.allSettled(files.map((file) => import(file)));

    const unwrapped: string[] = [];
    for (const [i, result] of results.entries()) {
      const file = relative(process.cwd(), files[i]);
      if (result.status === "rejected") {
        // 読み込み時に実 DB・外部サービスへ触れるモジュールを引き込んだ場合など。必要なら vi.mock を足す
        unwrapped.push(`${file}: 読み込みに失敗 (${String(result.reason)})`);
        continue;
      }
      const mod = result.value as Record<string, unknown>;
      for (const method of HTTP_METHODS) {
        const handler = mod[method];
        if (handler === undefined) continue;
        const marked =
          typeof handler === "function" &&
          (handler as unknown as Record<symbol, unknown>)[WRAPPED] === true;
        if (!marked) unwrapped.push(`${file}: ${method}`);
      }
    }

    expect(
      unwrapped,
      `withApiErrorHandling で包まれていない（または読み込めない）ハンドラ:\n${unwrapped.join("\n")}`,
    ).toEqual([]);
  });
});
