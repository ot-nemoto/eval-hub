> 最終更新: 2026-03-16

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

---

## v1.1 以降

フェーズ構成・優先順位は v1.1 着手時に改めて検討する。以下は候補タスク（順不同）。

- 実績管理・集計
  - 月次実績 API（GET/PUT /api/members/:id/records）
  - 月次実績入力画面（月×プロダクト×タスクのグリッド）
  - 配点管理 API（admin 用）
  - 年度切り替え処理（２年ルール項目の自動コピー）
- UI 整備・仕上げ
  - ダッシュボード（評価進捗・ロール認定状況のサマリ）
  - 印刷・PDF エクスポート（Overview 画面）
  - バリデーション強化・エラーハンドリング整備
  - レスポンシブ対応（タブレット）
  - E2E テスト（Playwright）主要フロー
  - ユーザー管理 API（admin による POST/DELETE /api/members）
