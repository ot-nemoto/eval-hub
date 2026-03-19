> 最終更新: 2026-03-19 (Phase 5〜7・継続的改善を追加)

# tasks.md — 実装タスク設計図

タスクの詳細・状態は **GitHub Issues** で管理する。

---

## MVP スコープ

> **MVP = Phase 1〜4**
>
> MVP の定義：「社員が自己評価を入力し、上長が評価・コメントを記録し、ロール認定状況を確認できる」

---

## Phase 1: 基盤構築

- [Issues — Phase 1: 基盤構築](https://github.com/ot-nemoto/eval-hub/milestone/1)

## Phase 2: 評価API

- [Issues — Phase 2: 評価API](https://github.com/ot-nemoto/eval-hub/milestone/2)

## Phase 3: 評価UI

- [Issues — Phase 3: 評価UI](https://github.com/ot-nemoto/eval-hub/milestone/3)

## Phase 4: デプロイ

- [Issues — Phase 4: デプロイ](https://github.com/ot-nemoto/eval-hub/milestone/4)

> **方針変更（2026-03-16）**: Cloudflare Workers は無料プランの 3 MiB サイズ制限を超過するため、**Vercel** にデプロイ先を変更。
>
> - T31: Cloudflare Workers 関連コードの削除（`@opennextjs/cloudflare`・`wrangler`・`wrangler.toml`）
> - T32: Vercel デプロイ設定（プロジェクト作成・環境変数設定）

## Phase 5: Admin管理機能の整備

- [Issues — Phase 5: Admin管理機能の整備](https://github.com/ot-nemoto/eval-hub/milestone/5)

| T番号 | タスク |
|-------|--------|
| T36 | 評価項目マスタ管理画面 |
| T62 | 評価者アサイン管理画面（admin） |

## Phase 6: 評価フロー完成

- [Issues — Phase 6: 評価フロー完成](https://github.com/ot-nemoto/eval-hub/milestone/6)

| T番号 | タスク |
|-------|--------|
| T33 | 評価進捗ダッシュボード（全ユーザー一覧） |
| T34 | 全ユーザー自己評価一覧画面 |
| T35 | 全ユーザー上長評価一覧画面 |
| T38 | 上長評価のコメント形式への変更 |
| T63 | 評価ステータス管理（提出・確定フロー） |

## Phase 7: 年度管理

- [Issues — Phase 7: 年度管理](https://github.com/ot-nemoto/eval-hub/milestone/7)

| T番号 | タスク |
|-------|--------|
| T27 | 年度管理方針の設計・実装 |
| T37 | 評価年度の切り替え機能 |

---

## 継続的改善

- [Issues — 継続的改善](https://github.com/ot-nemoto/eval-hub/milestone/8)

| T番号 | タスク |
|-------|--------|
| T53 | プロフィール名変更機能 |
| T64 | 評価コンポーネントの fetch ベース API 呼び出しを Server Actions に移行 |
| T65 | ユーザー管理画面のロール変更をリストボックス形式に変更 |
