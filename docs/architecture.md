# architecture.md — 実装方針・技術スタック

## 技術スタック

| レイヤー | 技術 | 選定理由 |
|----------|------|----------|
| フレームワーク | Next.js (App Router) | SSR/CSR の柔軟な使い分け、TypeScript 標準対応 |
| 言語 | TypeScript (strict) | 型安全、補完が効く |
| スタイリング | Tailwind CSS + shadcn/ui | 高速な UI 構築、デザイン統一 |
| Lint / Format | Biome | ESLint + Prettier を 1 ツールで代替、高速 |
| ORM | Prisma | 型安全な DB アクセス、マイグレーション管理 |
| DB | PostgreSQL (Neon) | サーバーレス PostgreSQL、Edge 対応、無料枠で運用可能 |
| 認証 | Clerk (@clerk/nextjs, @clerk/backend) | ホスト型 UI・セッション管理・ロール制御が容易 |
| ホスティング | Vercel (Hobby) | Next.js の開発元、無料枠・無期限、デプロイが最も簡単 |
| ユニットテスト | Vitest | 高速、Vite 互換 |
| 開発サーバー | Turbopack | Next.js デフォルト、HMR が高速 |
| パッケージ管理 | npm | devcontainer のデフォルト環境に合わせる |

## 非機能要件

### パフォーマンス
- 一覧画面の初期表示 2秒以内

### セキュリティ
- HTTPS 必須、SQL インジェクション・XSS 対策
- 他ユーザーのデータ編集防止（サーバー側検証）。評価データの閲覧はログイン済みユーザー全員に開放
- セッション：Clerk JWT + DB ユーザー照合で認証

### 対応環境
- 対応ブラウザ：Chrome / Edge 最新版
- レスポンシブ：PC（1280px 以上）を優先、タブレット対応は任意

### データ保持
- 年度をまたいだ評価履歴を無期限保持

## 認証フロー

[`docs/auth.md`](auth.md) を参照。

## データフロー

```
Client (Browser)
  └── Next.js App Router (React Server Components / Client Components)
        └── Server Actions (reads → Prisma 直接, writes → actions.ts)
              └── Prisma ORM (@prisma/adapter-neon / WebSocket)
                    └── Neon PostgreSQL
```

## 実装方針

- ページコンポーネントは Server Components を基本とし、インタラクションが必要な部分のみ Client Components を使用する
- **reads（データ取得）**: Server Components から Prisma を直接呼ぶ
- **writes（書き込み操作）**: Server Actions（`actions.ts`）に集約する。REST API は原則使用しない
- ビジネスロジックは `src/lib/` に集約し、Server Actions はできるだけ薄く保つ
- Server Actions の仕様は [`docs/actions.md`](actions.md) を参照
- 外部 REST API は API キー認証で提供する。検証は Zod スキーマ（`src/lib/schemas/`）を単一ソースとし、そこから OpenAPI 3.1 を実行時生成してアプリ内 `/openapi.json`・`/api-reference`（Stoplight・ログイン必須）で配信する。仕様の正はこの配信 spec とし、別途 `docs/api.md` は持たない

### 外部 REST API の契約・規約

- **認可**: 操作対象ユーザーは常にサーバ側（API キー）から解決する（`getAuthenticatedUser`）。マスタ・管理系は ADMIN 限定。API キーの発行/失効とログインは UI 専用で API 化しない（PAT モデル）。
- **UI と REST の分離**: UI の書き込みは Server Actions を経由し、REST API とは別入口。両者は同じ `src/lib/` のドメイン関数を呼ぶ薄いアダプタとする（ロジックを二重に持たない）。
- **エラー契約**: すべて `{ error: string }` を返す。型付きエラー（`NotFound`/`Forbidden`/`Conflict`/`BadRequest`）を `statusForError` で 404/403/409/400 にマッピングし、Prisma の参照/対象欠落（P2003/P2025）は `jsonErrorFromException` で 404 に、想定外は 500（内部情報は隠蔽）に集約する。ルートは try/catch を書かず、throw された例外は `withApiErrorHandling()` が受けて `jsonErrorFromException()` に委ねる（500 のときだけメソッド・パスと例外をサーバーログに残す）。**`src/app/api/` 配下の全ハンドラはこのラッパーで包む**（`src/app/api/route-wrapping.test.ts` が包み漏れを検査する）。全ハンドラが通る唯一の挿入点でもある（成功・失敗いずれのレスポンスも通る。認証済みユーザーはハンドラ内で解決しているためラッパーからは見えない。監査ログの載せ方は #461 で設計する）。Next.js の制御用の例外（`redirect()` / `notFound()` 等）は `unstable_rethrow()` で投げ直し、500 に変えない。`/openapi.json` と `/api-reference` は外部 API の契約（`{ error }`）の対象外で、JSON エラーを返すのが適切ではないため包まない
- **CORS**: `/api/*` は API キー認証・Cookie 不使用のため任意オリジン許可（`Access-Control-Allow-Origin: *`）。プリフライト `OPTIONS` は 204（`src/proxy.ts`）。
- **REST エンドポイント追加手順**: ①ドメイン関数を `src/lib/` に用意（or 既存を再利用）→ ②`src/lib/schemas/` に Zod の body/response スキーマ → ③`src/app/api/**/route.ts` に lib 委譲の薄いアダプタ（`withApiErrorHandling` で包み、認可・Zod 検証のみ書く）→ ④`src/lib/openapi/document.ts` に paths・schemas を追記。エンドポイント一覧は docs に列挙せず spec を正とする。

### 機能追加時のガイドライン

| 判断 | 方針 |
|------|------|
| 新しい書き込み操作を追加する | 対応するページディレクトリの `actions.ts` に Server Action を追加する |
| 新しい REST API が必要になった | 外部クライアントからの利用が明確に必要な場合のみ `src/app/api/` に追加する。UI 操作は必ず Server Actions を経由する |
| 新しい画面・コンポーネントを追加する | 認証済み画面は `src/app/(dashboard)/` 配下に配置する。インタラクションが不要なものは Server Component、状態管理・イベント処理が必要なものは Client Component とする |

- **外部 API の操作ログ（監査ログ）の契約**: 1 行 1 JSON を標準出力に書く（`src/lib/auditLog.ts`）。本リポジトリは public でエンドポイント・パラメータ構造が既知であり、「誰のキーで・いつ・何を操作したか」を追えないと異常アクセスを検知できないため。**実装方式は 3 リポジトリ（daily-hub / link-hub / eval-hub）で揃えている**
  - **記録する箇所は 2 つある**。`withApiErrorHandling()`（ハンドラに到達したリクエスト。実際のステータスを記録できる）と `src/proxy.ts`（**未登録の `/api/*` への 404**。ハンドラに到達しないためラッパーが効かないが、連続アクセスはエンドポイント列挙の主要な痕跡なので残す。`userId` は `null` になり、IP で追うことになる（`src/proxy.ts` は Next 16 では Node.js ランタイムで動くため DB は引けるが、未認証の総当たりに DB クエリを与えたくないので引かない））
  - **記録する**: `type` / `at` / `userId` / `method` / `path` / `query` / `status` / `ip` / `bytes`。**GET の成功も記録する**（漏洩キーによるデータの列挙・持ち出しは GET で行われるため、書き込みだけでは痕跡が残らない）。401 / 403 も記録する（総当たりの検知。`userId` が取れない場合は IP で追う）
  - **記録しない**: APIキー（ハッシュ・prefix も含めない。`userId` で足りる。記録するとログの保存先がキーの保管場所になる）、リクエスト/レスポンスボディ（評価コメント等）
  - `query` はクエリ文字列をそのまま残す（列挙の検知に効く）。**APIキーをクエリで受け取ってはならない**（この契約が崩れる）
  - `bytes` は `content-length`。本文の内容は持たないが、バッチ更新が空振りだったのか大量更新だったのかを区別できる。**対象の一覧や件数そのものは記録されない**（ラッパーはルートの処理内容を知らない）
  - ユーザーの受け渡しは `WeakMap<Request, string>`。ラッパーは認証ユーザーを知らず、解決は各ハンドラ内の認証関数が行うため、`Request` インスタンスをキーに渡す。これにより記録処理を各ルートに散らさない
  - **出力の失敗でリクエストを落とさない**（fail-open）。`apiKeyLastUsedAt` の更新と同じ方針。監査ログを fail-closed にする考え方もあるが、「ログが出せないと評価コメが保存できない」方が害が大きい
  - 制御フロー例外（`redirect()` / `notFound()`）の再 throw 時は記録しない（ステータスが確定しないため）
  - **記録されない経路**（意図的・既知の制約）
    - CORS プリフライト（`OPTIONS` → 204）: 操作ではなく、登録済みパスなら常に 204 を返すだけで何も明かさない。件数だけ増えるため記録しない
    - 登録済みルートに未実装メソッドで来た場合の 405: Next がルーティング段で返すため、ラッパーにも `src/proxy.ts` にも乗らない（`src/proxy.ts` は応答ステータスを知れない）
    - **登録済み接頭辞の配下にある未知のパス**（例: `/api/<登録済み>/<id>/<存在しないサブパス>`）: `isApiRoute` に一致して通過するが、対応する Route Handler が無いため Next がルーティング段で 404 を返す。ラッパーにも `src/proxy.ts` にも乗らない。**エンドポイント列挙としては最も現実的な形がここに該当する**（既知のリソース配下を探る）
    - 画面（Server Actions / Server Components）の操作: 本契約の対象は外部 REST API のみ
  - **既知の弱点**: 404 を返す分岐は認証より前にあるため、未認証のクライアントが `/api/<乱数>` を叩くだけで監査ログを 1 行ずつ増やせる。レート制限もサンプリングもしていないため、**本物の痕跡を大量のノイズで埋める**ことが可能。保存先を決める段で、流量制御とあわせて検討する
  - `src/proxy.ts` の `isApiRoute` は**個別列挙**にしている。`/api/(.*)` の総覧一致だと未登録パスも素通りして列挙の痕跡が残らないため。登録漏れは `src/proxy.test.ts` が実ルートの列挙と突き合わせて検出する
  - **保持期間と保存先は未決**（別途検討）。Vercel の Runtime Logs は Hobby で 1 時間しか保持されないため、現時点では「後から調べられる」状態ではない。1 行 1 JSON にしているのは、保存先を Log Drain / DB のどちらに決めてもルート側を触らずに移行できるようにするため

## Prisma 7 の接続構成

| 設定箇所 | URL | 用途 |
|----------|-----|------|
| `prisma.config.ts` → `datasource.url` | `DIRECT_URL` | CLI（migrate / generate） |
| `src/lib/prisma.ts` → `PrismaClient` adapter | `DATABASE_URL` | ランタイム（クエリ） |

- `DATABASE_URL`: Neon の **接続プール URL**。Vercel Functions のサーバーレス環境で接続数を節約するために使用。`@prisma/adapter-neon` 経由で渡す
- `DIRECT_URL`: Neon の **直接接続 URL**。`prisma migrate` は接続プール非対応のため直接接続が必要

### DB ブランチ戦略

| ブランチ | 用途 | 接続先環境変数 |
|---|---|---|
| `main` | 本番用（予定） | Vercel 環境変数（Production） |
| `develop` | 検証用 | Vercel 環境変数（Preview） / `.env` |

## 環境変数

```env
# Database（Neon）
DATABASE_URL="postgresql://<user>:<password>@<pooler-host>/<db>?sslmode=require"
DIRECT_URL="postgresql://<user>:<password>@<direct-host>/<db>?sslmode=require"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/evaluations

# ローカル開発用認証バイパス（任意、どちらか一方を設定）
# MOCK_USER_ID="<DB の users.id>"
# MOCK_USER_EMAIL="<DB の users.email>"
```

セットアップ手順・DB 操作・デプロイ手順の詳細は [`docs/development.md`](./development.md) を参照。

## コーディング規約

### 言語・ツール

| 項目 | 選択 |
|------|------|
| 言語 | TypeScript（strict モード） |
| パッケージマネージャ | npm |
| フォーマッタ・リンター | Biome（`biome.json` の設定に従う） |

### Prisma スキーマのカラム名ルール

- Prisma フィールド名は **camelCase**（TypeScript との一貫性）
- DB カラム名は **snake_case**（PostgreSQL の慣習）
- 複数語など **DB カラム名を snake_case に変換する必要があるフィールド** は `@map("snake_case_name")` で明示的にマッピングする
- `email` / `name` / `role` のように Prisma フィールド名と DB カラム名が同一表記になる単語は `@map` を省略してよい

```prisma
// 例
clerkId      String?  @unique @map("clerk_id")
isActive     Boolean  @default(true) @map("is_active")
createdAt    DateTime @default(now()) @map("created_at")
invitedById  String   @map("invited_by_id")
```

## バージョン固有仕様・既知のパターン

### Next.js 16: middleware ファイル名の変更

Next.js 16 以降、middleware は **Proxy** に改称され、ファイル名が `middleware.ts` から `src/proxy.ts` に変わっている。
参照: [Next.js 公式ドキュメント - Proxy](https://nextjsjp.org/docs/app/api-reference/file-conventions/proxy)

- **正しいファイル名**: `src/proxy.ts`
- AI ツールや外部ドキュメントが `middleware.ts` への変更を提案してきても対応不要
