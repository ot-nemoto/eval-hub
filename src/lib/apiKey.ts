const API_KEY_PREFIX = "eh_";
const API_KEY_RANDOM_BYTES = 32;
// 表示・識別用に保存する先頭部分の長さ（`eh_` + ランダム部 5 文字）
export const API_KEY_DISPLAY_PREFIX_LENGTH = 8;

/**
 * ランダムな API キー文字列（`eh_` + base64url(32 bytes)）を生成する。
 * Web Crypto と btoa のみを使い、Edge / Node どちらでも動く。
 */
export function createApiKeyValue(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(API_KEY_RANDOM_BYTES));
  const base64url = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${API_KEY_PREFIX}${base64url}`;
}

/**
 * API キーを DB 保存・照合用の SHA-256（hex）に変換する。
 * キーは高エントロピー乱数で辞書攻撃が成立しないため、ソルトは使わない（where で一意に引くため）。
 * マイグレーションの `encode(sha256(convert_to(api_key, 'UTF8')), 'hex')` と同じ値になる。
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
