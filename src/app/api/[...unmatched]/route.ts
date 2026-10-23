import { jsonError, withApiErrorHandling } from "@/lib/api-response";

/**
 * 実在しない `/api/*` パスを受けて `{ error }` 形式の 404 を返す。
 *
 * `isApiRoute` は接頭辞一致なので、実在しないパスでも一致して `src/proxy.ts` を
 * 通過する。Route Handler が無ければ Next がルーティング段で 404 を返すため、
 * ラッパーも `proxy.ts` も通らず**エンドポイント列挙が無痕跡になっていた**。
 *
 * 既知のリソース配下を探る形（`/api/evaluations/<id>/export` 等）が列挙としては
 * 最も現実的なので、ここを塞ぐ必要がある。ラッパーで包むため記録は自動的に効く。
 *
 * `src/proxy.ts` の 404 分岐とは担当が異なり、両方必要。
 * - 未知の接頭辞（`/api/foo`）: `isApiRoute` に一致しないため、`proxy.ts` の
 *   404 分岐が**その場で応答を返して記録する**（`auth.protect()` には到達しない）。
 *   ルーティングまで来ないため、ここでは捕まえられない → `proxy.ts` が担当。
 *   **この分岐を「冗長」として消すと穴が再発する**
 * - 登録済み接頭辞の配下: `isApiRoute` に一致して通過する。`proxy.ts` は実在する
 *   ルートかを知れないため判定できない → ここが担当
 *
 * `OPTIONS` は export しない。`proxy.ts` が `isApiRoute` 一致時の `OPTIONS` を
 * 204 で返すため、ここには到達しない。
 */
// 引数を受け取らない形にすると Args が [] に推論され、ラッパーが Request を
// 受け取れない型になる（監査ログは args[0] の Request から記録する）。
const notFound = withApiErrorHandling(async (_req: Request) => jsonError("Not Found", 404));

export const GET = notFound;
export const POST = notFound;
export const PATCH = notFound;
export const PUT = notFound;
export const DELETE = notFound;
export const HEAD = notFound;
