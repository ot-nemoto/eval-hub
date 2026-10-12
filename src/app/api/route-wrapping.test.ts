// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 全 API ルートのハンドラが withApiErrorHandling で包まれていることを固定する。
 *
 * 捕捉されない例外を `500 { error }` に変換する責務はラッパーにあり、包み忘れると
 * そのルートだけ Next.js 既定の 500（spec が定める `{ error }` 形式でない）に戻る。
 * ルート追加のたびに人が気づく必要がないよう、構造として検査する。
 *
 * 検査対象は `src/app/api/` 配下のみ。`/openapi.json`・`/api-reference` は
 * 外部 API の契約（`{ error }`）の対象外で、JSON エラーを返すのが適切ではない。
 */
const HTTP_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"] as const;

/** 配下のルートファイル（route.ts / route.tsx / route.js 等）をすべて列挙する（追加ライブラリに依存しない） */
function findRouteFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findRouteFiles(path);
    return /^route\.(?:ts|tsx|js|jsx|mts|mjs)$/.test(entry.name) ? [path] : [];
  });
}

describe("API ルートのエラーハンドリング", () => {
  it("全ハンドラが withApiErrorHandling で包まれている", () => {
    const files = findRouteFiles(join(process.cwd(), "src/app/api"));
    expect(files.length).toBeGreaterThan(0);

    const unwrapped: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf-8");
      for (const method of HTTP_METHODS) {
        // export された形を網羅的に拾う（function / async function / const / 再 export）。
        // 「包まれていない形」を列挙する作りにすると、列挙から漏れた書き方
        // （例: `export function GET(`）が素通りする。
        const exported =
          new RegExp(`^export\\s+(?:async\\s+)?(?:function|const)\\s+${method}\\b`, "m").test(
            source,
          ) || new RegExp(`^export\\s*\\{[^}]*\\b${method}\\b[^}]*\\}`, "m").test(source);
        if (!exported) continue;

        const wrapped = new RegExp(`^export const ${method} = withApiErrorHandling\\(`, "m").test(
          source,
        );
        if (!wrapped) unwrapped.push(`${file}: ${method}`);
      }
    }

    expect(
      unwrapped,
      `withApiErrorHandling で包まれていないハンドラ:\n${unwrapped.join("\n")}`,
    ).toEqual([]);
  });
});
