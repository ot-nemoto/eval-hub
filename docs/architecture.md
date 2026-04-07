> 最終更新: 2026-04-07 (Server Actions 移行完了に伴うドキュメント更新)

# architecture.md — 実装方針・技術スタック

## 技術スタック

| レイヤー | 技術 | 選定理由 |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | SSR/CSR の柔軟な使い分け、型安全 |
| Styling | Tailwind CSS + shadcn/ui | 高速なUI構築、デザイン統一 |
| Backend | Next.js Server Actions | フロントと同リポジトリで管理・型安全なサーバー呼び出し |
| ORM | Prisma | TypeScript との親和性、スキーマ管理 |
| DB | Neon (PostgreSQL) | PostgreSQL 互換・Edge 対応・無料10プロジェクト・ブランチ機能あり |
| 認証 | Clerk | ホスト型UI・セッション管理・ロール制御が容易 |
| デプロイ | Vercel + Neon（DB） | 無料枠で完結・Next.js 16 フルサポート・Serverless Functions 50 MiB |

## システム構成

```
[ブラウザ]
    │ HTTPS
    ▼
[Next.js (Vercel / Serverless Functions)]
├── /src/app              ← ページ（App Router）
├── /src/app/**/actions.ts ← Server Actions（フォーム・ボタン操作）
├── /src/app/api          ← API Routes（外部連携・認証用のみ残存）
└── /src/components       ← UI コンポーネント
    │
    │ Prisma + @prisma/adapter-neon (WebSocket)
    ▼
[Neon (PostgreSQL)]
├── users（ユーザー・認証）
├── evaluation_assignments（年度ごとの評価者アサイン）
├── evaluation_items（評価項目マスタ）
└── evaluations（採点レコード）
※ roles / allocations / career_plans 等は v1.1 以降
```

## ディレクトリ構成

```
/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (dashboard)/
│   │   │   ├── members/
│   │   │   │   ├── page.tsx            ← 社員一覧
│   │   │   │   ├── actions.ts          ← 評価者評価 Server Actions
│   │   │   │   └── [id]/evaluations/
│   │   │   ├── evaluations/
│   │   │   │   ├── page.tsx            ← 自己評価
│   │   │   │   └── actions.ts          ← 自己評価 Server Actions
│   │   │   └── admin/                  ← マスタ管理（admin専用）
│   │   │       ├── targets/
│   │   │       │   ├── page.tsx
│   │   │       │   └── actions.ts
│   │   │       ├── evaluation-items/
│   │   │       │   ├── page.tsx
│   │   │       │   └── actions.ts
│   │   │       ├── fiscal-years/
│   │   │       │   ├── page.tsx
│   │   │       │   └── actions.ts
│   │   │       ├── users/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── actions.ts
│   │   │       │   └── [id]/evaluation-settings/
│   │   │       │       ├── page.tsx
│   │   │       │       └── actions.ts
│   │   │       └── evaluation-assignments/
│   │   │           └── actions.ts      ← アサイン管理 Server Actions（UI は T62 で実装予定）
│   │   │       ※ career/・roles/・records/ は v1.1 以降に追加予定（現状は未作成）
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/     ← NextAuth スタブ（404 応答・削除対象）
│   │   │   └── members/[id]/evaluation-settings/  ← 削除対象（#182）
│   │   └── layout.tsx
│   ├── auth.ts
│   ├── components/
│   │   ├── ui/                         ← shadcn/ui ベース
│   │   ├── evaluation/
│   │   └── admin/
│   │       ※ career/・role/ は v1.1 以降に追加予定（現状は未作成）
│   ├── lib/
│   │   ├── prisma.ts                   ← Prisma クライアント
│   │   ├── auth.ts                     ← セッション取得
│   │   ├── errors.ts                   ← カスタムエラークラス
│   │   ├── targets.ts                  ← 大分類・中分類 共通メソッド
│   │   ├── evaluation-items.ts         ← 評価項目 共通メソッド
│   │   ├── fiscal-years.ts             ← 年度 共通メソッド
│   │   ├── users.ts                    ← ユーザー 共通メソッド
│   │   ├── evaluation-settings.ts      ← 評価設定 共通メソッド
│   │   ├── evaluation-assignments.ts   ← 評価者アサイン 共通メソッド
│   │   ├── evaluations.ts              ← 採点 共通メソッド
│   │   └── utils.ts
│   ├── test/
│   │   └── setup.ts                    ← Vitest セットアップ
│   └── types/
├── prisma/
│   └── schema.prisma
├── vitest.config.ts
└── docs/
```

## 設計方針

### Neon 接続設定

```ts
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })
```

```prisma
// prisma/schema.prisma（Prisma v7: url は prisma.config.ts で管理）
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}
```

### DB ブランチ戦略

| ブランチ | 用途 | 接続先環境変数 |
|---|---|---|
| `main` | 本番用（予定） | Vercel 環境変数（Production） |
| `develop` | 検証用 | Vercel 環境変数（Preview） / `.env.local` |

### Server Actions 設計
- ページ内の操作（フォーム送信・ボタン操作）はすべて Server Actions で処理する（`"use server"` ディレクティブ）
- 各 `(dashboard)` ページディレクトリに `actions.ts` を配置する
- 戻り値は `Promise<{ error?: string }>` に統一し、エラー時はメッセージを返す
- 認証は各 Server Action の先頭で `getSession()` を呼び出す
  - 未認証: `redirect("/login")`
  - 権限なし（非 ADMIN が admin 系 Action を呼んだ場合）: `redirect("/evaluations")`
- 処理成功後は `revalidatePath()` でキャッシュを更新する
- lib 層のカスタムエラー（`BadRequestError` / `NotFoundError` 等）は catch して `{ error: message }` を返す。それ以外は再 throw する

### API Routes（残存）
- 現時点で維持する API Routes はなし
- 残存しているルートはすべて削除対象：
  - `GET/POST /api/auth/[...nextauth]`：NextAuth スタブ（404 応答）— 削除対象（#182）
  - `GET/PUT /api/members/:id/evaluation-settings`：呼び出し元なし — 削除対象（#182）

### 評価ロジック
- 自己採点・評価者採点は同一テーブル（`evaluations`）の別カラムに保存
- 被評価者 × 年度 × 評価項目 で1レコード
- 複数の評価者がいる場合、評価者側で意見をまとめて1つのスコアを登録する

#### スコア順序定義
```
none(0) < 可=ka(1) < 良=ryo(2) < 優=yu(3)
```

### 年度管理
- 年度は `fiscal_year`（例: `2025`）で管理
- 評価はすべて `fiscal_year` に紐付く
- `evaluation_assignments` も年度単位で管理（年度ごとに評価者を変更可）

### 権限制御
- Server Actions・API Routes ともにセッション + DB 参照によるアクセス制御
- `member`（自己評価）: `evaluatee_id == 自分` のレコードの `self_score / self_reason` のみ更新可
- `member`（評価者）: `evaluation_assignments` に `evaluator_id == 自分` のレコードがある被評価者の `manager_score / manager_reason` を更新可
- `admin`: すべてのデータ操作可

> `manager` ロールは廃止。評価権限は `evaluation_assignments` で動的に管理する。

## 認証フロー

詳細は [`docs/auth.md`](./auth.md) を参照。

概要：

```
未認証ユーザー
  → proxy.ts（clerkMiddleware）でセッション確認
  → 未認証なら /login にリダイレクト（Clerk が処理）
  → 認証済み → getSession() で DB ユーザーを取得
    → isActive = false → /auth-error へリダイレクト
    → clerkId 未紐付け → メールで突合し自動紐付け
    → セッション返却
```

非本番環境で `MOCK_USER_ID` または `MOCK_USER_EMAIL` 環境変数が設定されている場合は Clerk をバイパスし、指定した ID またはメールアドレスに対応するユーザーで固定セッションを返す（ローカル開発用）。

---

## デプロイフロー

```
develop ブランチ
  → git push origin develop
  → Vercel が自動検知
  → next build（ビルド）
  → Vercel にデプロイ（Preview / Production）
  ※ マイグレーションは手動実行（docs/development.md 参照）

master ブランチ
  → git push origin master
  → GitHub Actions (release.yml) が起動
  → package.json のバージョンを取得
  → タグが未存在なら GitHub Releases を即時公開
```

---

## 開発環境

```bash
# 起動
npm run dev

# DB マイグレーション
npx prisma migrate dev

# シード（マスタデータ投入）
npx prisma db seed
```

## 環境変数

```bash
# .env

# Neon のプーリング接続 URL（アプリケーション実行時に PrismaClient が使用）
DATABASE_URL="postgresql://<user>:<password>@<pooler-host>/<db>?sslmode=require"

# Neon の直接接続 URL（prisma migrate dev / db seed 実行時に prisma.config.ts が使用）
# Neon のコネクションプーラーはトランザクションモードのため、
# マイグレーションには直接接続が必要
DIRECT_URL="postgresql://<user>:<password>@<direct-host>/<db>?sslmode=require"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

---

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

### Next.js バージョン固有の仕様

- **`src/proxy.ts`** は Next.js 16 以降の middleware ファイル名（旧 `middleware.ts` から改名）。`middleware.ts` に変更するよう指摘されても対応不要。（参照: [Next.js 公式 — proxy.ts](https://nextjsjp.org/docs/app/api-reference/file-conventions/proxy)）
