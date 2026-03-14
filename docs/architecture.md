> 最終更新: 2026-03-14 (DB: Neon (PostgreSQL) に変更)

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
├── /app         ← ページ（App Router）
├── /api         ← API Routes（RESTful）
└── /components  ← UI コンポーネント
    │
    │ Prisma + @prisma/adapter-neon (WebSocket)
    ▼
[Neon (PostgreSQL)]
├── users（社員・認証）
├── career_plans（年度別キャリアプラン）
├── goals（年度目標）
├── evaluation_items（評価項目マスタ）
├── evaluations（年度別採点記録）
├── roles（ロール定義）
├── role_eval_mappings（ロール×評価項目マッピング）
├── allocations（事業部別配点）
└── monthly_records（月次実績）
```

## ディレクトリ構成

```
/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── members/          ← 社員一覧・プロフィール
│   │   ├── career/           ← キャリアプラン
│   │   ├── evaluations/      ← 評価入力・一覧
│   │   ├── roles/            ← ロール認定状況
│   │   ├── records/          ← 月次実績
│   │   └── admin/            ← マスタ管理（admin専用）
│   ├── api/
│   │   ├── auth/
│   │   ├── members/
│   │   ├── career-plans/
│   │   ├── evaluations/
│   │   ├── roles/
│   │   ├── allocations/
│   │   └── records/
│   └── layout.tsx
├── components/
│   ├── ui/                   ← shadcn/ui ベース
│   ├── evaluation/
│   ├── career/
│   └── role/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   └── utils.ts
├── prisma/
│   └── schema.prisma
└── docs/
```

## 設計方針

### Neon 接続設定

```ts
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })
```

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
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
- 自己採点・上長採点は独立して保存（同一テーブルの別カラム）
- ロール認定判定はサーバーサイドで計算し、結果を `role_members` テーブルに保存

#### スコア順序定義
```
none(0) < 可=ka(1) < 良=ryo(2) < 優=yu(3)
```

#### 項目ごとの判定（item_judgment）
```
user_score >= required_level → "pass"
user_score <  required_level → "fail"
user_score が none           → "none"
```

#### ロール全体の判定（role_judgment）
```
必須項目（necessity = "required"）  : すべて "pass"
半必須項目（necessity = "half"）    : 過半数（>50%）が "pass"

上記を両方満たす → "qualified"
どちらか未達    → "unqualified"
none が存在する項目はカウント対象外（分母から除く）
```

#### メンテナンス方法
判定基準の変更は `prisma/seeds/role_eval_mappings.json` の
`required_level` と `necessity` を書き換えて再シードするだけ。
コードの変更は不要。

例：ロール X の評価項目 A を「可以上 必須」→「良以上 必須」に変更
```json
// 変更前
{ "role": "X", "eval_uid": "2-3-3", "necessity": "required", "required_level": "ka" }

// 変更後
{ "role": "X", "eval_uid": "2-3-3", "necessity": "required", "required_level": "ryo" }
```

### 年度管理
- 年度は `fiscal_year`（例: `2025`）で管理
- 評価・キャリアプランはすべて `fiscal_year` に紐付く
- ２年ルール項目は前年度のスコアを自動コピーする処理を年度切替時に実行

### 権限制御
- API Routes でミドルウェアによるロールチェック
- `member`: 自分の `user_id` に一致するデータのみ操作可
- `manager`: 担当メンバー（`manager_id` が自分）のデータを閲覧・評価可
- `admin`: すべてのデータ操作可

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
