# CLAUDE.md

開発の共通規約は `.claude/common-rules.md`（dev-commons から同期）に集約している。本ファイルはそれをインポートし、**このリポジトリ固有の情報のみ**を記載する。

@.claude/common-rules.md

---

## 作業開始時のチェックリスト

1. `docs/product.md` を読みプロダクトの目的・対象ユーザーを理解する
2. `docs/architecture.md` で実装方針・設計判断・バージョン gotcha を確認する
3. `docs/ui.md` で画面仕様・機能要件・UI 規約を確認する
4. `docs/development.md` で開発・デプロイ手順を確認する
5. DB・API・認証・Server Actions に触れる場合は `docs/schema.md` / `docs/api.md` / `docs/actions.md` / `docs/auth.md` を確認する
6. タスクの状態・実装順は GitHub Issues / Milestone で確認する

## 本リポジトリのドキュメント採否

- **必須ドキュメント**: `product` / `architecture` / `ui` / `development`
- **条件付き必須ドキュメント**: `api`（外部 REST API・認証用ルート）/ `actions`（書き込みは Server Actions に集約）/ `schema`（Prisma + PostgreSQL を利用）/ `auth`（Clerk 認証フロー）
  - 不採用: `kintone-fields`（外部データソース参照なし）/ `integrations`（外部サービス連携は認証の Clerk のみで `auth.md` に集約）/ `infra`（Vercel + Neon 構成は `architecture.md` / `development.md` に集約）

## テスト対象（このリポジトリ固有）

- ユニットテスト対象: `src/lib/`（ビジネスロジック・ユーティリティ関数）
- API ルート: `src/app/api/`（`route.ts`）を対象に含める
