> 最終更新: 2026-03-15 (MVPスコープを評価登録に絞り、DB構成・権限制御を更新)

# architecture.md — 実装方針・技術スタック

## 技術スタック

| レイヤー | 技術 | 選定理由 |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | SSR/CSR の柔軟な使い分け、型安全 |
| Styling | Tailwind CSS + shadcn/ui | 高速なUI構築、デザイン統一 |
| Backend | Next.js API Routes | フロントと同リポジトリで管理しやすい |
| ORM | Prisma | TypeScript との親和性、スキーマ管理 |
| DB | Neon (PostgreSQL) | PostgreSQL 互換・Edge 対応・無料10プロジェクト・ブランチ機能あり |
| 認証 | NextAuth.js | セッション管理・ロール制御が容易 |
| デプロイ | Cloudflare Pages（Frontend） + Neon（DB） | 無料枠で完結 |

## システム構成

```
[ブラウザ]
    │ HTTPS
    ▼
[Next.js (Cloudflare Pages / Edge Runtime)]
├── /src/app         ← ページ（App Router）
├── /src/app/api     ← API Routes（RESTful）
└── /src/components  ← UI コンポーネント
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
│   │   │   ├── members/          ← 社員一覧・プロフィール
│   │   │   ├── career/           ← キャリアプラン
│   │   │   ├── evaluations/      ← 評価入力・一覧
│   │   │   ├── roles/            ← ロール認定状況
│   │   │   ├── records/          ← 月次実績
│   │   │   └── admin/            ← マスタ管理（admin専用）
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── members/
│   │   │   ├── career-plans/
│   │   │   ├── evaluations/
│   │   │   ├── roles/
│   │   │   ├── allocations/
│   │   │   └── records/
│   │   └── layout.tsx
│   ├── auth.ts
│   ├── components/
│   │   ├── ui/                   ← shadcn/ui ベース
│   │   ├── evaluation/
│   │   ├── career/
│   │   └── role/
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── utils.ts
│   ├── test/
│   │   └── setup.ts              ← Vitest セットアップ
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
| `main` | staging 用 | Cloudflare Pages の staging 環境変数 |
| `develop` | develop 用 | `.env.local` |

### API 設計
- RESTful に統一（GET / POST / PUT / DELETE）
- レスポンスは `{ data, error, meta }` の統一フォーマット
- 認証は JWT（NextAuth.js のセッショントークン）をヘッダーで渡す

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
- API Routes でセッション + DB 参照によるアクセス制御
- `member`（自己評価）: `evaluatee_id == 自分` のレコードの `self_score / self_reason` のみ更新可
- `member`（評価者）: `evaluation_assignments` に `evaluator_id == 自分` のレコードがある被評価者の `manager_score / manager_reason` を更新可
- `admin`: すべてのデータ操作可

> `manager` ロールは廃止。評価権限は `evaluation_assignments` で動的に管理する。

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
# .env.local
DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```
