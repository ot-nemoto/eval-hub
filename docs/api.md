> 最終更新: 2026-04-07 (Server Actions 移行完了に伴い、移行済み API Routes の記載を削除)

# api.md — API 仕様

## 概要

Phase 8 の Server Actions 移行により、以下の操作は Server Actions に移行済みです（`docs/architecture.md` 参照）。

- 大分類・中分類マスタ（targets / categories）
- 評価項目マスタ（evaluation-items）
- 年度管理（fiscal-years）
- ユーザー管理（admin/users）
- 評価者アサイン管理（evaluation-assignments）
- 自己評価・評価者評価入力（evaluations）

本ドキュメントには **外部連携用途で残存する API Routes** のみを記載します。

---

## 残存 API Routes

現在、内部向け API Routes はすべて Server Actions に移行済みです。
残存しているのは以下の外部連携・認証用のみです：

| パス | 用途 |
|---|---|
| `/api/auth/[...nextauth]` | Clerk 認証コールバック（外部連携） |

> `GET/PUT /api/members/:id/evaluation-settings` は未削除ですが、呼び出し元がなく削除対象です（#182）。

---

## v1.1 以降（defer）

以下のエンドポイントは v1.1 で追加予定。

| エンドポイント | 機能 |
|---|---|
| `GET/PUT /api/members/:id` | 社員プロフィール |
| `GET/PUT /api/members/:id/career-plans/:year` | キャリアプラン |
| `GET/POST/PUT/DELETE /api/goals` | 年度目標 |
| `GET /api/roles` | ロール一覧 |
| `GET /api/members/:id/roles/:year` | ロール認定状況 |
| `GET/PUT /api/allocations/:year` | 配点管理 |
| `GET/PUT /api/members/:id/records/:year` | 月次実績 |
