# EvalHub — エンジニア評価・キャリアプラン管理システム

エンジニアの評価とキャリアプランを Excel から Web アプリへ移行するための管理システム。
自己評価・上長評価の入力、ロール認定状況の可視化、年度ごとのキャリアプランの記録を一元管理する。

## 解決する課題

- Excel ファイルの属人管理・バージョン管理の煩雑さ
- 自己評価と上長評価の突合・集計の手間
- ロール認定状況（qualified / unqualified）の可視化不足
- 年度ごとのキャリアプランの変遷が追いにくい

## 技術スタック

| レイヤー | 技術 |
|---|---|
| Frontend | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| ORM | Prisma |
| DB | TiDB Cloud Serverless（MySQL 互換） |
| 認証 | NextAuth.js |
| デプロイ | Cloudflare Pages + TiDB Cloud Serverless |

## ユーザーロール

| ロール | 権限 |
|---|---|
| `member` | 自分のデータのみ閲覧・編集 |
| `manager` | 担当メンバーの評価・コメント入力 |
| `admin` | マスタデータの管理・全データ閲覧 |

## 開発環境のセットアップ

### 必要なもの

- Node.js 20 以上
- TiDB Cloud Serverless アカウント（無料）

### 手順

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集して TiDB の接続情報を設定

# DB スキーマの適用
npx prisma db push

# マスタデータの投入
npx prisma db seed

# 開発サーバーの起動
npm run dev
```

### 環境変数

```bash
# .env.local
DATABASE_URL="mysql://<user>:<password>@<host>:4000/<db>?sslaccept=strict"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

## ディレクトリ構成

```
/
├── app/
│   ├── (auth)/login/          ← ログイン
│   ├── (dashboard)/
│   │   ├── members/           ← 社員一覧・プロフィール
│   │   ├── career/            ← キャリアプラン・年度目標
│   │   ├── evaluations/       ← 評価入力（自己・上長）
│   │   ├── roles/             ← ロール認定状況
│   │   └── admin/             ← マスタ管理（admin 専用）
│   └── api/v1/                ← RESTful API
├── components/
│   ├── ui/                    ← shadcn/ui ベース
│   ├── evaluation/
│   ├── career/
│   └── role/
├── lib/
│   ├── prisma.ts              ← TiDB 接続
│   ├── auth.ts
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   └── seeds/                 ← マスタデータ JSON
│       ├── evaluation_items.json
│       ├── roles.json
│       ├── role_eval_mappings.json
│       └── allocations.json
└── docs/                      ← 設計ドキュメント
```

## ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/product.md](docs/product.md) | プロダクト概要・目的・機能全体像 |
| [docs/requirements.md](docs/requirements.md) | 機能要件・非機能要件・ユースケース |
| [docs/architecture.md](docs/architecture.md) | 技術スタック・設計方針・TiDB 接続設定 |
| [docs/api.md](docs/api.md) | API エンドポイント仕様 |
| [docs/schema.md](docs/schema.md) | DB テーブル定義・インデックス |
| [docs/tasks.md](docs/tasks.md) | 実装タスク・進捗管理 |
| [docs/seed.md](docs/seed.md) | マスタデータ管理・判定基準の変更方法 |

## MVP スコープ

> 「社員が自己評価を入力し、上長が評価・コメントを記録し、ロール認定状況を確認できる」

| フェーズ | 内容 | 対象 |
|---|---|---|
| Phase 1 | 基盤構築（認証・DB・マスタデータ） | MVP |
| Phase 2 | 評価入力・ロール認定 | MVP |
| Phase 3 | キャリアプラン・年度目標 | MVP |
| Phase 4 | 月次実績・配点管理 | v1.1 以降 |
| Phase 5 | UI整備・ダッシュボード | v1.1 以降 |

## ロール認定ロジック

評価採点（可/良/優）と各ロールの要求水準を比較して自動判定する。
判定基準は `prisma/seeds/role_eval_mappings.json` を編集して再シードするだけで変更可能。

```
必須項目（○）: すべて required_level 以上 → pass
半必須項目（△）: 過半数が required_level 以上 → pass
両方満たす → qualified / どちらか未達 → unqualified
```
