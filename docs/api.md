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

### 共通仕様

#### ベース URL
```
/api
```

#### 認証
- すべてのエンドポイントで Clerk セッション（httpOnly Cookie）が必要
- サーバー側で `getSession()` を呼び出し、未認証の場合は 401 を返す

#### レスポンス形式（成功）
```json
{ "data": {...}, "meta": { "total": 100 } }
```

#### スコア値の定義

| 値 | 意味 |
|---|---|
| `"none"` | なし（未評価） |
| `"ka"` | 可 |
| `"ryo"` | 良 |
| `"yu"` | 優 |

---

## エラーレスポンス定義

### 形式

すべてのエラーレスポンスは以下の JSON 形式で返す。

```json
{ "error": { "code": "ERROR_CODE", "message": "エラーメッセージ" } }
```

### ステータスコード一覧

| コード | HTTP | 説明 |
|---|---|---|
| `BAD_REQUEST` | 400 | リクエストの形式・値が不正 |
| `UNAUTHORIZED` | 401 | 未認証 |
| `FORBIDDEN` | 403 | 権限なし |
| `NOT_FOUND` | 404 | リソースが存在しない |
| `CONFLICT` | 409 | リソースの重複 |
| `INTERNAL_SERVER_ERROR` | 500 | サーバー内部エラー |

---

## エンドポイント一覧

| メソッド | パス | 説明 | ロール |
|---|---|---|---|
| GET | `/api/members/:id/evaluation-settings` | 自己評価要否設定取得 | member（本人）/ admin |
| PUT | `/api/members/:id/evaluation-settings/:year` | 自己評価要否設定更新 | admin |

---

## 自己評価要否設定

### GET /api/members/:id/evaluation-settings
ユーザーの自己評価要否設定一覧取得

**Response**
```json
{
  "data": [
    { "fiscalYear": 2026, "selfEvaluationEnabled": false },
    { "fiscalYear": 2025, "selfEvaluationEnabled": true }
  ]
}
```

**権限**: admin および本人のみ

---

### PUT /api/members/:id/evaluation-settings/:year
年度ごとの自己評価要否を更新

**Request**
```json
{ "selfEvaluationEnabled": false }
```

**Response**: `200 OK`
```json
{ "data": { "fiscalYear": 2026, "selfEvaluationEnabled": false } }
```

**権限**: admin のみ

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
