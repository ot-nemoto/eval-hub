# architecture.md — 実装方針・技術スタック

## 技術スタック

| レイヤー | 技術 | 選定理由 |
|----------|------|----------|
| フレームワーク | Next.js 16 (App Router) | SSR/CSR の柔軟な使い分け、TypeScript 標準対応 |
| 言語 | TypeScript (strict) | 型安全、補完が効く |
| スタイリング | Tailwind CSS v4 + shadcn/ui | 高速な UI 構築、デザイン統一 |
| Lint / Format | Biome | ESLint + Prettier を 1 ツールで代替、高速 |
| ORM | Prisma 7 | 型安全な DB アクセス、マイグレーション管理 |
| DB | PostgreSQL (Neon) | サーバーレス PostgreSQL、Edge 対応、無料枠で運用可能 |
| 認証 | Clerk (@clerk/nextjs v7, @clerk/backend v3) | ホスト型 UI・セッション管理・ロール制御が容易 |
| ホスティング | Vercel (Hobby) | Next.js の開発元、無料枠・無期限、デプロイが最も簡単 |
| ユニットテスト | Vitest | 高速、Vite 互換 |
| 開発サーバー | Turbopack | Next.js 16 デフォルト、HMR が高速 |
| パッケージ管理 | npm | devcontainer のデフォルト環境に合わせる |

## ディレクトリ構成

```
eval-hub/
├── .github/
│   ├── instructions/
│   │   └── review.instructions.md  # Copilot PR レビュー指示
│   └── workflows/
│       ├── bump-version.yml        # master PR ラベルで自動バージョンバンプ
│       └── release.yml             # master push 時に自動リリース
├── docs/                           # 設計ドキュメント
├── prisma/
│   ├── schema.prisma               # DB スキーマ定義
│   ├── seed.ts                     # 開発用シードデータ
│   └── migrations/                 # マイグレーションファイル
├── prisma.config.ts                # Prisma 7 設定（datasource URL）
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/              # Clerk SignIn
│   │   ├── auth-error/             # 認証エラー（isActive=false 等）
│   │   ├── (dashboard)/
│   │   │   ├── actions.ts          # 共通 Server Actions（年度切り替え・名前変更）
│   │   │   ├── members/
│   │   │   │   ├── page.tsx        # 社員一覧
│   │   │   │   ├── actions.ts      # 評価者評価 Server Actions
│   │   │   │   └── [id]/evaluations/
│   │   │   ├── evaluations/
│   │   │   │   ├── page.tsx        # 自己評価
│   │   │   │   └── actions.ts      # 自己評価 Server Actions
│   │   │   └── admin/              # マスタ管理（ADMIN 専用）
│   │   │       ├── targets/        # 大分類・中分類
│   │   │       ├── evaluation-items/   # 評価項目
│   │   │       ├── fiscal-years/   # 年度管理
│   │   │       ├── users/          # ユーザー管理
│   │   │       │   └── [id]/evaluation-settings/  # 評価設定
│   │   │       └── evaluation-assignments/  # 評価者アサイン
│   │   ├── api/                    # API Routes（外部連携・認証用のみ。現在は残存のみ）
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                     # shadcn/ui ベース
│   │   ├── evaluation/             # 評価関連
│   │   └── admin/                  # 管理画面
│   ├── lib/
│   │   ├── prisma.ts               # Prisma クライアント
│   │   ├── auth.ts                 # セッション取得
│   │   ├── errors.ts               # カスタムエラークラス
│   │   ├── targets.ts              # 大分類・中分類
│   │   ├── categories.ts           # 中分類
│   │   ├── evaluation-items.ts     # 評価項目
│   │   ├── fiscal-years.ts         # 年度
│   │   ├── users.ts                # ユーザー
│   │   ├── evaluation-settings.ts  # 評価設定
│   │   ├── evaluation-assignments.ts  # 評価者アサイン
│   │   ├── evaluations.ts          # 採点
│   │   └── utils.ts
│   ├── test/
│   │   └── setup.ts                # Vitest セットアップ
│   └── proxy.ts                    # Next.js 16 middleware（旧 middleware.ts）
├── CLAUDE.md
├── biome.json
├── vitest.config.ts
└── package.json
```

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
- 外部 REST API の方針は [`docs/api.md`](api.md) を参照

### 機能追加時のガイドライン

| 判断 | 方針 |
|------|------|
| 新しい書き込み操作を追加する | 対応するページディレクトリの `actions.ts` に Server Action を追加する |
| 新しい REST API が必要になった | 外部クライアントからの利用が明確に必要な場合のみ `src/app/api/` に追加する。UI 操作は必ず Server Actions を経由する |
| 新しい画面・コンポーネントを追加する | 認証済み画面は `src/app/(dashboard)/` 配下に配置する。インタラクションが不要なものは Server Component、状態管理・イベント処理が必要なものは Client Component とする |

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
| `develop` | 検証用 | Vercel 環境変数（Preview） / `.env.local` |

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
