> 最終更新: 2026-03-15 (MVPスコープを評価登録に絞り、APIを再設計)

# api.md — API 仕様

## 共通仕様

### ベース URL
```
/api/v1
```

### 認証
- すべてのエンドポイントで `Authorization: Bearer <token>` が必要（認証エンドポイントを除く）
- NextAuth.js のセッショントークンを使用

### レスポンス形式
```json
// 成功
{ "data": {...}, "meta": { "total": 100 } }

// エラー
{ "error": { "code": "UNAUTHORIZED", "message": "認証が必要です" } }
```

### エラーコード一覧

| コード | HTTP | 説明 |
|---|---|---|
| `BAD_REQUEST` | 400 | リクエストの形式・値が不正 |
| `UNAUTHORIZED` | 401 | 未認証 |
| `FORBIDDEN` | 403 | 権限なし |
| `NOT_FOUND` | 404 | リソースが存在しない |
| `CONFLICT` | 409 | リソースの重複 |
| `INTERNAL_SERVER_ERROR` | 500 | サーバー内部エラー |

### スコア値の定義

| 値 | 意味 |
|---|---|
| `"none"` | なし（未評価） |
| `"ka"` | 可 |
| `"ryo"` | 良 |
| `"yu"` | 優 |

---

## 認証

### POST /api/auth/[...nextauth]
NextAuth.js による認証（ログイン・セッション管理）

---

## 評価項目マスタ

### GET /api/v1/evaluation-items
評価項目一覧

**Query**: `?target=employee&category=engagement`

**Response**
```json
{
  "data": [
    {
      "uid": "1-1-1",
      "target": "employee",
      "category": "engagement",
      "name": "会社員としての基本姿勢",
      "description": "...",
      "eval_criteria": "...",
      "two_year_rule": false
    }
  ]
}
```

**権限**: 認証済みユーザー全員

---

## 評価者アサイン

### GET /api/v1/evaluation-assignments
アサイン一覧（admin のみ）

**Query**: `?fiscal_year=2025`

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "fiscal_year": 2025,
      "evaluatee": { "id": "uuid", "name": "山田 太郎" },
      "evaluator": { "id": "uuid", "name": "鈴木 一郎" }
    }
  ]
}
```

### POST /api/v1/evaluation-assignments
アサイン登録（admin のみ）

**Request**
```json
{
  "fiscal_year": 2025,
  "evaluatee_id": "uuid",
  "evaluator_id": "uuid"
}
```

**Response**: `201 Created`
```json
{ "data": { "id": "uuid", "fiscal_year": 2025, "evaluatee_id": "uuid", "evaluator_id": "uuid" } }
```

### DELETE /api/v1/evaluation-assignments/:id
アサイン削除（admin のみ）

**Response**: `204 No Content`

---

## 評価

### GET /api/v1/members/:id/evaluations/:year
指定年度の評価一覧

**Response**
```json
{
  "data": [
    {
      "eval_uid": "1-1-1",
      "item_name": "会社員としての基本姿勢",
      "self_score": "ryo",
      "self_reason": "日報を毎日記録し...",
      "manager_score": "ryo",
      "manager_reason": "採用業務を一次メンバーで対応可能になるよう..."
    }
  ]
}
```

**権限**
- 本人（`id == 自分`）
- アサインされた評価者（`evaluation_assignments` に `evaluatee_id == :id` かつ `evaluator_id == 自分` のレコードがある）
- admin

### PUT /api/v1/members/:id/evaluations/:year/:uid
採点入力・更新

**Request（本人の場合）**
```json
{
  "self_score": "ryo",
  "self_reason": "日報を毎日記録し..."
}
```

**Request（評価者の場合）**
```json
{
  "manager_score": "yu",
  "manager_reason": "採用委員長として..."
}
```

**権限**
- `self_score / self_reason`：本人のみ
- `manager_score / manager_reason`：アサインされた評価者または admin

**Response**: `200 OK`
```json
{
  "data": {
    "eval_uid": "1-1-1",
    "self_score": "ryo",
    "self_reason": "...",
    "manager_score": "yu",
    "manager_reason": "..."
  }
}
```

---

## v1.1 以降（defer）

以下のエンドポイントは v1.1 で追加予定。

| エンドポイント | 機能 |
|---|---|
| `GET/PUT /api/v1/members/:id` | 社員プロフィール |
| `GET/PUT /api/v1/members/:id/career-plans/:year` | キャリアプラン |
| `GET/POST/PUT/DELETE /api/v1/goals` | 年度目標 |
| `GET /api/v1/roles` | ロール一覧 |
| `GET /api/v1/members/:id/roles/:year` | ロール認定状況 |
| `GET/PUT /api/v1/allocations/:year` | 配点管理 |
| `GET/PUT /api/v1/members/:id/records/:year` | 月次実績 |
