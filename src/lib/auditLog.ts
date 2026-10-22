/**
 * 外部 API の操作ログ（監査ログ）を 1 行 1 JSON で標準出力に書く。
 *
 * 本リポジトリは public でエンドポイント・パラメータ構造が完全に既知であり、
 * 「誰のキーで・いつ・何を操作したか」を追えないと異常アクセスを検知できない。
 * プラットフォーム側のリクエストログはパス・ステータス・時刻のみで
 * ユーザーを特定できないため、アプリ側で出す。
 *
 * **保持期間と保存先は未決**（別途検討）。Vercel の Runtime Logs は
 * Hobby で 1 時間しか保持されないため、現時点では「後から調べられる」状態ではない。
 * 1 行 1 JSON にしているのは、保存先を Log Drain / DB のどちらに決めても
 * ルート側を触らずに移行できるようにするため。
 *
 * 実装方式は 3 リポジトリ（daily-hub / link-hub / eval-hub）で揃えている。
 */

/**
 * 認証済みユーザーをラッパーへ受け渡すための箱。
 *
 * ユーザー解決は各ハンドラ内の認証関数が行うため、ハンドラを包む
 * `withApiErrorHandling` はそれを知らない。記録処理を各ルートに散らさずに
 * 済ませるため、`Request` インスタンスをキーに受け渡す。
 *
 * WeakMap なのでリクエスト終了後は GC 対象になり、明示的な解放が不要。
 * AsyncLocalStorage でも実現できるが、こちらの方が単純でランタイム依存を持たない。
 */
const auditUserIds = new WeakMap<Request, string>();

/** 認証が通ったユーザーを記録する。認証関数から呼ぶ。 */
export function setAuditUserId(req: Request, userId: string) {
  auditUserIds.set(req, userId);
}

/** Vercel が付けるヘッダから接続元 IP を取る。401 では userId が無く、総当たり検知に必要。 */
function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  // x-forwarded-for は "client, proxy1, proxy2" の形になりうる
  const first = forwarded?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || null;
}

/** リクエスト本文のバイト数。欠落・不正な値は null にする。 */
function contentLength(req: Request): number | null {
  const raw = req.headers.get("content-length");
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** 監査ログ 1 件の形。保存先を決めるときの契約になる。 */
export type AuditRecord = {
  type: "audit";
  at: string;
  userId: string | null;
  method: string;
  path: string;
  query: string;
  status: number;
  ip: string | null;
  bytes: number | null;
};

export function buildAuditRecord(req: Request, status: number): AuditRecord {
  const url = new URL(req.url);
  return {
    type: "audit",
    at: new Date().toISOString(),
    userId: auditUserIds.get(req) ?? null,
    method: req.method,
    path: url.pathname,
    // クエリ文字列は列挙の検知に効くため残す。APIキーは Authorization ヘッダで
    // 渡るため、ここに秘密情報は乗らない。
    query: url.search,
    status,
    ip: clientIp(req),
    // 本文の内容は記録しないが、バイト数は残す。バッチ更新が空振りだったのか
    // 大量更新だったのかを、本文を持たずに区別できる。
    bytes: contentLength(req),
  };
}

/**
 * 監査ログを出力する。
 *
 * 出力の失敗でリクエストを落とさない（apiKeyLastUsedAt の更新と同じ方針）。
 * 監査ログを fail-closed にする考え方もあるが、「ログが出せないと
 * 評価 が保存できない」方が害が大きい。
 */
export function logAudit(req: Request, status: number) {
  try {
    console.log(JSON.stringify(buildAuditRecord(req, status)));
  } catch (e) {
    console.error("[audit] 監査ログの出力に失敗した", e);
  }
}
