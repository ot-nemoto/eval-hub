> 最終更新: 2026-03-13

# tasks.md — 実装タスク設計図

## タスク状態管理

個々のタスクの状態（未着手 / 進行中 / 完了）・担当・依存関係は **GitHub Issues** で管理する。

→ [GitHub Issues — ot-nemoto/eval-hub](https://github.com/ot-nemoto/eval-hub/issues)

---

## MVP スコープ

> **MVP = Phase 1〜4**
>
> MVP の定義：「社員が自己評価を入力し、上長が評価・コメントを記録し、ロール認定状況を確認できる」

## フェーズ構成（MVP）

```
Phase 1: 基盤構築
Phase 2: コアデータ管理（評価・ロール）
Phase 3: キャリアプラン・目標管理
Phase 4: デプロイ
```

---

## Phase 1: 基盤構築

| # | タスク | 依存 |
|---|---|---|
| 1-1 | Next.js プロジェクト初期化（App Router + TypeScript） | — |
| 1-2 | Tailwind CSS + shadcn/ui セットアップ | 1-1 |
| 1-3 | TiDB Cloud Serverless 接続・Prisma セットアップ（`@tidbcloud/prisma-adapter`） | 1-1 |
| 1-4 | Prisma スキーマ定義（schema.md に基づく全テーブル・MySQL 向け） | 1-3 |
| 1-5 | `prisma db push` でスキーマ適用・DB 生成 | 1-4 |
| 1-6 | NextAuth.js 認証実装（ログイン・セッション・ロール制御） | 1-3 |
| 1-7 | API レスポンス共通フォーマット実装 | 1-1 |
| 1-8 | マスタデータシード（evaluation_items / roles / role_eval_mappings / allocations） | 1-5 |

---

## Phase 2: コアデータ管理（評価・ロール）

| # | タスク | 依存 |
|---|---|---|
| 2-1 | GET /api/v1/evaluation-items 実装 | 1-8 |
| 2-2 | GET/PUT /api/v1/members/:id/evaluations/:year 実装 | 2-1 |
| 2-3 | 評価一覧画面（カテゴリ別タブ・自己採点入力） | 2-2 |
| 2-4 | 上長評価入力 UI（マネージャー向け） | 2-2 |
| 2-5 | GET /api/v1/roles + /mappings 実装 | 1-8 |
| 2-6 | ロール認定判定ロジック実装（サーバーサイド） | 2-2, 2-5 |
| 2-7 | GET /api/v1/members/:id/roles/:year 実装 | 2-6 |
| 2-8 | ロール認定状況画面（qualified / unqualified 表示） | 2-7 |

---

## Phase 3: キャリアプラン・目標管理

| # | タスク | 依存 |
|---|---|---|
| 3-1 | 社員プロフィール API（GET/PUT /api/v1/members/:id） | 1-6 |
| 3-2 | 配属履歴 API | 3-1 |
| 3-3 | キャリアプラン API（GET/PUT /api/v1/members/:id/career-plans/:year） | 3-1 |
| 3-4 | 目標 API（CRUD /api/v1/goals） | 3-3 |
| 3-5 | 目標と評価 UID の紐付け API | 3-4 |
| 3-6 | Overview 画面（基本情報・現在ロール・将来ロール表示） | 3-3 |
| 3-7 | 年度目標入力フォーム（大項目・Goal・取り組み・期間・進捗） | 3-4 |
| 3-8 | 面談コメント入力（中間・期末） | 3-3 |
| 3-9 | 社員一覧画面（manager / admin 用） | 3-1 |

---

## Phase 4: デプロイ

| # | タスク | 依存 |
|---|---|---|
| 4-1 | デプロイ設定（Cloudflare Pages + TiDB Cloud Serverless） | Phase 1〜3 |

---

## v1.1 以降

フェーズ構成・優先順位は v1.1 着手時に改めて検討する。以下は候補タスク（順不同）。

- 実績管理・集計
  - 月次実績 API（GET/PUT /api/v1/members/:id/records）
  - 月次実績入力画面（月×プロダクト×タスクのグリッド）
  - 配点管理 API（admin 用）
  - 年度切り替え処理（２年ルール項目の自動コピー）
- UI 整備・仕上げ
  - ダッシュボード（評価進捗・ロール認定状況のサマリ）
  - 印刷・PDF エクスポート（Overview 画面）
  - バリデーション強化・エラーハンドリング整備
  - レスポンシブ対応（タブレット）
  - E2E テスト（Playwright）主要フロー
  - ユーザー管理 API（admin による POST/DELETE /api/v1/members）
