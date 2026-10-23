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

/**
 * リクエスト本文のバイト数。欠落・不正な値は null にする。
 *
 * Number() を使わない: `""` が 0、`"1e3"` が 1000、`"0x10"` が 16 になり、
 * クライアントが送った不正な content-length から値をでっち上げてしまう。
 * RFC 9110 の Content-Length は 10 進数字列のみなので、その形だけを受ける。
 */
function contentLength(req: Request): number | null {
  const raw = req.headers.get("content-length");
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
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
  /**
   * この `IP:ステータス` の組がこの窓の上限に達したことを示す。
   * これ以降この窓では**この組の**記録をしない（同じ IP の別ステータスは記録し続ける
   * ため、1 窓に複数の `throttled` が出ることはある）。未認証の洪水を検知するための印。
   */
  throttled?: true;
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
 * 未認証リクエストの記録を `IP:ステータス` ごとに抑制する。
 *
 * 404 を返す経路（`src/proxy.ts` とキャッチオール）は認証より前・認証なしで通るため、
 * **キーを持たない誰でも記録を 1 行ずつ増やせる**。レート制限が無いと、
 * 本物の痕跡を大量のノイズで埋められる（検知のための機能が検知を妨げる手段になる）。
 *
 * 認証済みの記録は抑制しない。キーの発行数で上界があるため。
 *
 * **既知の制約**: Serverless ではインスタンス間で状態を共有できないため、
 * 抑制はインスタンス単位になる。完全な上限ではないが増幅を実用的な範囲に抑えられる。
 * 厳密な制限が必要なら共有ストアが必要（保存先の決定と同時に検討する）。
 */
const WINDOW_MS = 60 * 1000;

/**
 * `IP:ステータス` あたり 1 窓の記録上限。
 * 未認証の正常トラフィックは実質ゼロ（クライアントはキーを使う）。
 */
const MAX_PER_KEY = 30;

/**
 * 追跡する鍵（`IP:ステータス`）の上限。IP を変えながらの攻撃でメモリが膨らむのを防ぐ。
 * 超えたら**抑制をやめて記録する**（fail-open）。痕跡を失うより、
 * 洪水が洪水として見える方がよい。
 */
const MAX_TRACKED_KEYS = 10_000;

let windowStart = 0;
/**
 * `IP:ステータス` → この窓で記録した件数。
 *
 * **ステータスごとに独立した予算にする。** IP だけを鍵にすると、攻撃者が安い
 * 404（未登録パスを叩くだけ）で予算を使い切ってから総当たりを始めることで、
 * **401 の記録を 1 件も残さずにキーを探れる**。予算を共有すると、ノイズで
 * 埋めるどころか別の信号を完全に消せてしまう。
 */
const counters = new Map<string, number>();

/**
 * 記録してよいかを判定する。
 *
 * - 上限までは `"record"`
 * - 上限に達した最初の 1 件は `"throttle"`（印を付けて記録し、以降この窓では黙る）
 * - それ以降は `"skip"`
 *
 * 抑制した件数を次の窓へ繰り越す形も検討したが、窓をまたぐ状態が必要になり
 * 「捨てると信号が消える／残すとメモリが漏れる」ジレンマになる。
 * 抑制開始時に 1 件だけ印付きで記録すれば、**1 窓分でメモリが完結したまま
 * 「この IP が洪水を起こしている」信号は保てる**。正確な件数は
 * プラットフォーム側のリクエストログで分かる。
 */
function classify(ip: string | null, status: number): "record" | "throttle" | "skip" {
  // IP が取れない場合は抑制しない（鍵が無く、まとめて数えると正当な記録まで落ちる）
  if (ip === null) return "record";

  const now = Date.now();
  if (now - windowStart >= WINDOW_MS) {
    windowStart = now;
    // 窓が切り替わったら捨てる。1 窓分にメモリを限定する
    counters.clear();
  }

  const key = `${ip}:${status}`;
  if (counters.size >= MAX_TRACKED_KEYS && !counters.has(key)) return "record";

  const recorded = counters.get(key) ?? 0;
  counters.set(key, recorded + 1);

  if (recorded < MAX_PER_KEY) return "record";
  return recorded === MAX_PER_KEY ? "throttle" : "skip";
}

/** テスト用に内部状態を初期化する。 */
export function resetAuditThrottle() {
  windowStart = 0;
  counters.clear();
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
    const record = buildAuditRecord(req, status);
    // 認証済みの記録は抑制しない（キーの発行数で上界がある）
    if (record.userId === null) {
      const verdict = classify(record.ip, record.status);
      if (verdict === "skip") return;
      // 抑制の開始を 1 件だけ記録に残す。「その IP が洪水を起こしている」信号を失わないため
      if (verdict === "throttle") record.throttled = true;
    }
    console.log(JSON.stringify(record));
  } catch (e) {
    // 標準出力が書けない状況では標準エラーも書けないことがある。ここで例外が
    // 漏れると、呼び出し元（withApiErrorHandling の try 内）に捕まって
    // 成功済みの応答が 500 に化ける。fail-open を実際に成立させるため二重に飲む。
    try {
      console.error("[audit] 監査ログの出力に失敗した", e);
    } catch {}
  }
}
