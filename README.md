# EvalHub

![CI](https://github.com/ot-nemoto/eval-hub/actions/workflows/ci.yml/badge.svg)
![Version](https://img.shields.io/github/package-json/v/ot-nemoto/eval-hub)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?logo=clerk&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

エンジニアの自己評価・評価者評価を年度ごとに記録・管理する評価管理 Web アプリ。

## 機能

- Clerk によるメールアドレス＋パスワード認証（ADMIN / MEMBER ロール）
- 評価者アサイン管理（年度ごとに評価者と被評価者を紐付け）
- 自己評価・評価者評価の入力（採点＋理由テキスト）
- 評価者コメントの追加・編集・削除
- 年度ロック（評価編集の一括制限）
- ユーザー管理（有効化・無効化・削除）

詳細は [docs/product.md](docs/product.md) / [docs/requirements.md](docs/requirements.md) を参照。

## ドキュメント

設計ドキュメントは [`docs/`](docs/) に格納。

| ファイル | 内容 |
|----------|------|
| [docs/product.md](docs/product.md) | プロダクト定義・目的 |
| [docs/requirements.md](docs/requirements.md) | 機能要件・非機能要件・画面一覧 |
| [docs/architecture.md](docs/architecture.md) | 技術スタック・ディレクトリ構成・実装方針 |
| [docs/api.md](docs/api.md) | 外部 REST API エンドポイント定義 |
| [docs/actions.md](docs/actions.md) | Server Actions 定義 |
| [docs/schema.md](docs/schema.md) | DB スキーマ・Prisma モデル定義 |
| [docs/ui.md](docs/ui.md) | 画面一覧・遷移・UI コンポーネント仕様 |
| [docs/auth.md](docs/auth.md) | 認証フロー・保護ルート |
| [docs/development.md](docs/development.md) | ローカルセットアップ・Prisma 操作・デプロイ手順 |
| [docs/tasks.md](docs/tasks.md) | フェーズ別マイルストーン |
| [docs/testing.md](docs/testing.md) | 自動テスト方針・カバレッジ規約・実行手順 |
| [docs/e2e-scenarios.md](docs/e2e-scenarios.md) | E2E テストシナリオ・手動テスト観点 |

## クイックスタート

セットアップ・環境変数の詳細は [docs/development.md](docs/development.md) を参照。

```bash
npm install
# 環境変数を設定してから起動（docs/development.md 参照）
npm run dev   # http://localhost:3000
```
