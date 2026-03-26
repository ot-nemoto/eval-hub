> 最終更新: 2026-03-26 (エラーレスポンス定義セクションを追加)

# api.md — API 仕様

## 共通仕様

### ベース URL
```
/api
```

### 認証
- すべてのエンドポイントで Clerk セッション（httpOnly Cookie）が必要
- サーバー側で `getSession()` を呼び出し、未認証の場合は 401 を返す

### レスポンス形式（成功）
```json
{ "data": {...}, "meta": { "total": 100 } }
```

### スコア値の定義

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
| GET | `/api/admin/targets` | 大分類一覧取得 | admin |
| POST | `/api/admin/targets` | 大分類作成 | admin |
| PATCH | `/api/admin/targets/:id` | 大分類更新 | admin |
| DELETE | `/api/admin/targets/:id` | 大分類削除 | admin |
| GET | `/api/admin/categories` | 中分類一覧取得 | admin |
| POST | `/api/admin/categories` | 中分類作成 | admin |
| PATCH | `/api/admin/categories/:id` | 中分類更新 | admin |
| DELETE | `/api/admin/categories/:id` | 中分類削除 | admin |
| GET | `/api/admin/evaluation-items` | 評価項目一覧取得（admin） | admin |
| POST | `/api/admin/evaluation-items` | 評価項目作成 | admin |
| PATCH | `/api/admin/evaluation-items/:id` | 評価項目更新 | admin |
| DELETE | `/api/admin/evaluation-items/:id` | 評価項目削除 | admin |
| GET | `/api/evaluation-items` | 評価項目一覧取得（一般） | member / admin |
| GET | `/api/evaluation-assignments` | 評価者アサイン一覧取得 | admin |
| POST | `/api/evaluation-assignments` | 評価者アサイン作成 | admin |
| DELETE | `/api/evaluation-assignments/:id` | 評価者アサイン削除 | admin |
| GET | `/api/members/:id/evaluations/:year` | 採点一覧取得 | member（本人・評価者）/ admin |
| PUT | `/api/members/:id/evaluations/:year/:uid` | 採点登録・更新 | member（本人・評価者）/ admin |
| GET | `/api/members/:id/evaluation-settings` | 自己評価要否設定取得 | member（本人）/ admin |
| PUT | `/api/members/:id/evaluation-settings/:year` | 自己評価要否設定更新 | admin |
| GET | `/api/admin/fiscal-years` | 年度一覧取得 | admin |
| POST | `/api/admin/fiscal-years` | 年度作成 | admin |
| PATCH | `/api/admin/fiscal-years/:year` | 年度更新 | admin |
| DELETE | `/api/admin/fiscal-years/:year` | 年度削除 | admin |
| GET | `/api/admin/fiscal-years/:year/items` | 年度別有効評価項目取得 | admin |
| POST | `/api/admin/fiscal-years/:year/items` | 年度別有効評価項目追加 | admin |
| DELETE | `/api/admin/fiscal-years/:year/items/:itemId` | 年度別有効評価項目削除 | admin |
| GET | `/api/admin/users` | ユーザー一覧取得 | admin |
| PATCH | `/api/admin/users/:id` | ユーザー更新（ロール・有効化） | admin |
| DELETE | `/api/admin/users/:id` | ユーザー削除 | admin |

---

## 大分類マスタ

### GET /api/admin/targets
大分類一覧取得（admin のみ）

**Response**
```json
{
  "data": [
    { "id": 1, "name": "employee", "no": 1 },
    { "id": 2, "name": "projects", "no": 2 }
  ]
}
```

### POST /api/admin/targets
大分類追加（admin のみ）

**Request**
```json
{ "name": "新しい大分類", "no": 3 }
```

**Response**: `201 Created`

### PATCH /api/admin/targets/:id
大分類編集（admin のみ）。`name`・`no` を更新可。

**Request**
```json
{ "name": "更新後の名称" }
```

**Response**: `200 OK`

### DELETE /api/admin/targets/:id
大分類削除（admin のみ）

- `categories` が紐づいている場合は `409 Conflict`

**Response**: `204 No Content`

---

## 中分類マスタ

### GET /api/admin/categories
中分類一覧取得（admin のみ）

**Query**: `?targetId=1`

**Response**
```json
{
  "data": [
    { "id": 1, "targetId": 1, "name": "engagement", "no": 1 },
    { "id": 2, "targetId": 1, "name": "skill", "no": 2 }
  ]
}
```

### POST /api/admin/categories
中分類追加（admin のみ）

**Request**
```json
{ "targetId": 1, "name": "新しい中分類", "no": 3 }
```

**Response**: `201 Created`

### PATCH /api/admin/categories/:id
中分類編集（admin のみ）。`name`・`no` を更新可。

**Request**
```json
{ "name": "更新後の名称" }
```

**Response**: `200 OK`

### DELETE /api/admin/categories/:id
中分類削除（admin のみ）

- `evaluation_items` が紐づいている場合は `409 Conflict`

**Response**: `204 No Content`

---

## 評価項目マスタ

### GET /api/admin/evaluation-items
評価項目一覧取得（admin のみ）

**Response**
```json
{
  "data": [
    {
      "id": 1,
      "targetId": 1,
      "categoryId": 1,
      "no": 1,
      "name": "会社員としての基本姿勢",
      "description": "...",
      "evalCriteria": "...",
      "target": { "id": 1, "name": "employee", "no": 1 },
      "category": { "id": 1, "targetId": 1, "name": "engagement", "no": 1 }
    }
  ]
}
```

### POST /api/admin/evaluation-items
評価項目追加（admin のみ）。no はカテゴリ内の最大値 +1 でサーバー側自動採番。uid（`{target.no}-{category.no}-{no}`）は表示用に動的算出。

**Request**
```json
{
  "targetId": 1,
  "categoryId": 1,
  "name": "新しい評価項目",
  "description": null,
  "evalCriteria": null
}
```

**Response**: `201 Created`

### PATCH /api/admin/evaluation-items/:id
評価項目編集（admin のみ）。`name`・`description`・`evalCriteria` を更新可。

**Request**
```json
{ "name": "更新後の名称" }
```

**Response**: `200 OK`

### DELETE /api/admin/evaluation-items/:id
評価項目削除（admin のみ）

- 年度（`fiscal_year_items`）に紐づいている場合は `409 Conflict`

**Response**: `204 No Content`

---

### GET /api/evaluation-items
評価項目一覧

**Query**: `?targetId=1&categoryId=1`

**Response**
```json
{
  "data": [
    {
      "id": 1,
      "targetId": 1,
      "categoryId": 1,
      "no": 1,
      "name": "会社員としての基本姿勢",
      "description": "...",
      "evalCriteria": "...",
      "target": { "id": 1, "name": "employee", "no": 1 },
      "category": { "id": 1, "targetId": 1, "name": "engagement", "no": 1 }
    }
  ]
}
```

**権限**: 認証済みユーザー全員

---

## 評価者アサイン

### GET /api/evaluation-assignments
アサイン一覧（admin のみ）

**Query**: `?fiscalYear=2025`

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "fiscalYear": 2025,
      "evaluatee": { "id": "uuid", "name": "山田 太郎" },
      "evaluator": { "id": "uuid", "name": "鈴木 一郎" }
    }
  ]
}
```

### POST /api/evaluation-assignments
アサイン登録（admin のみ）

**Request**
```json
{
  "fiscalYear": 2025,
  "evaluateeId": "uuid",
  "evaluatorId": "uuid"
}
```

**Response**: `201 Created`
```json
{ "data": { "id": "uuid", "fiscalYear": 2025, "evaluateeId": "uuid", "evaluatorId": "uuid" } }
```

### DELETE /api/evaluation-assignments/:id
アサイン削除（admin のみ）

**Response**: `204 No Content`

---

## 評価

### GET /api/members/:id/evaluations/:year
指定年度の評価一覧

**Response**
```json
{
  "data": [
    {
      "eval_item_id": 1,
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
- アサインされた評価者（`evaluation_assignments` に `evaluateeId == :id` かつ `evaluatorId == 自分` のレコードがある）
- admin

### PUT /api/members/:id/evaluations/:year/:uid
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
    "eval_item_id": 1,
    "self_score": "ryo",
    "self_reason": "...",
    "manager_score": "yu",
    "manager_reason": "..."
  }
}
```

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

## 年度管理（admin）

### GET /api/admin/fiscal-years
年度一覧取得（admin のみ）

**Response**
```json
{
  "data": [
    {
      "year": 2026,
      "name": "2026年度",
      "startDate": "2026-04-01T00:00:00.000Z",
      "endDate": "2027-03-31T00:00:00.000Z",
      "isCurrent": true
    },
    {
      "year": 2025,
      "name": "2025年度",
      "startDate": "2025-04-01T00:00:00.000Z",
      "endDate": "2026-03-31T00:00:00.000Z",
      "isCurrent": false
    }
  ]
}
```

### POST /api/admin/fiscal-years
年度追加（admin のみ）。直近年度の評価項目紐付けを自動コピー。

**Request**
```json
{
  "year": 2027,
  "name": "2027年度",
  "startDate": "2027-04-01",
  "endDate": "2028-03-31"
}
```

**Response**: `201 Created`
```json
{
  "data": {
    "year": 2027,
    "name": "2027年度",
    "startDate": "2027-04-01T00:00:00.000Z",
    "endDate": "2028-03-31T00:00:00.000Z",
    "isCurrent": false
  }
}
```

### PATCH /api/admin/fiscal-years/:year
年度編集（admin のみ）。`name`・`startDate`・`endDate`・`isCurrent` を更新可。
`isCurrent: true` を設定すると他の年度の `isCurrent` は自動的に `false` になる。

**Request**
```json
{
  "isCurrent": true
}
```

**Response**: `200 OK`
```json
{
  "data": {
    "year": 2026,
    "name": "2026年度",
    "startDate": "2026-04-01T00:00:00.000Z",
    "endDate": "2027-03-31T00:00:00.000Z",
    "isCurrent": true
  }
}
```

### DELETE /api/admin/fiscal-years/:year
年度削除（admin のみ）

- `evaluations`・`evaluation_assignments`・`evaluation_settings`・`fiscal_year_items` に紐づくデータがある場合は `409 Conflict`

**Response**: `204 No Content`

---

### GET /api/admin/fiscal-years/:year/items
年度に紐づく評価項目一覧（admin のみ）

**Response**
```json
{
  "data": [
    {
      "id": 1,
      "targetId": 1,
      "categoryId": 1,
      "no": 1,
      "name": "会社員としての基本姿勢"
    }
  ]
}
```

### POST /api/admin/fiscal-years/:year/items
年度に評価項目を追加（admin のみ）

**Request**
```json
{ "evaluationItemId": 1 }
```

**Response**: `201 Created`
```json
{ "data": { "fiscalYear": 2026, "evaluationItemId": 1 } }
```

### DELETE /api/admin/fiscal-years/:year/items/:itemId
年度から評価項目を削除（admin のみ）

**Response**: `204 No Content`

---

## ユーザー管理（admin）

### GET /api/admin/users
ユーザー一覧取得（admin のみ）

**Response**
```json
{
  "data": [
    { "id": "uuid", "name": "山田太郎", "email": "yamada@example.com", "role": "member", "division": "開発部", "joinedAt": null, "createdAt": "2026-01-01T00:00:00.000Z", "isActive": true }
  ]
}
```

### PATCH /api/admin/users/:id
ロール変更・有効/無効化（admin のみ）。`role` と `isActive` はどちらか一方、または同時に指定可。

**Request（ロール変更）**
```json
{ "role": "admin" }
```

**Request（無効化）**
```json
{ "isActive": false }
```

**Response**: `200 OK`
```json
{ "data": { "id": "uuid", "name": "山田太郎", "email": "yamada@example.com", "role": "member", "isActive": false } }
```

### DELETE /api/admin/users/:id
ユーザー削除（admin のみ）

- 評価データ・アサインデータが存在する場合は `409 Conflict`
- 自分自身は削除不可（`403 Forbidden`）

**Response**: `204 No Content`

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
