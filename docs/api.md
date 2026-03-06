> 最終更新: 2026-03-06

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
{ "data": {...}, "meta": { "total": 100, "page": 1 } }

// エラー
{ "error": { "code": "UNAUTHORIZED", "message": "認証が必要です" } }
```

### スコア値の定義
| 値 | 意味 |
|---|---|
| `"none"` | なし（未評価） |
| `"ka"` | 可 |
| `"ryo"` | 良 |
| `"yu"` | 優 |

---

## 認証

### POST /api/auth/login
ログイン

**Request**
```json
{ "email": "nemoto@example.com", "password": "..." }
```
**Response**
```json
{ "data": { "token": "jwt...", "user": { "id": "uuid", "name": "根本賢一郎", "role": "member" } } }
```

---

## 社員（Members）

### GET /api/v1/members
社員一覧（manager / admin のみ）

**Query**: `?division=観光&fiscal_year=2025`

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "根本賢一郎",
      "division": "観光ビッグデータ事業部",
      "joined_at": "2010-05-01",
      "role": "member",
      "current_position": "EL"
    }
  ]
}
```

### GET /api/v1/members/:id
社員詳細

### PUT /api/v1/members/:id
社員情報更新（本人または admin）

**Request**
```json
{
  "name": "根本賢一郎",
  "division": "観光ビッグデータ事業部",
  "wants_president_meeting": false
}
```

---

## キャリアプラン（Career Plans）

### GET /api/v1/members/:id/career-plans
年度別キャリアプラン一覧

**Response**
```json
{
  "data": [
    { "fiscal_year": 2025, "current_position": "EL", "future_roles_self": ["server side engineer", "Software Architect"] }
  ]
}
```

### GET /api/v1/members/:id/career-plans/:year
指定年度のキャリアプラン詳細

### PUT /api/v1/members/:id/career-plans/:year
キャリアプラン更新（本人入力 or 上長コメント追記）

**Request**
```json
{
  "current_roles_self": ["server side engineer", "platform engineer", "Software Architect"],
  "current_roles_official": ["server side engineer", "platform engineer", "database engineer", "Software Architect", "Customer Success"],
  "current_position": "EL",
  "future_roles_self": ["server side engineer", "Software Architect"],
  "future_comment": "サポート・指導をメインとしていきたい",
  "interim_comment": "AI活用の広がりが見られます...",
  "final_comment": "ELとしての目立つ成果は薄かった..."
}
```

---

## 年度目標（Goals）

### GET /api/v1/members/:id/career-plans/:year/goals
目標一覧

### POST /api/v1/members/:id/career-plans/:year/goals
目標追加

**Request**
```json
{
  "category": "事業部活動",
  "title": "AI推進",
  "goal_criteria": "チームへの共有し、基盤決定。",
  "action": "SSDサービスの調査を行い、チームで進めるうえでの基盤選定を行う。",
  "period": "1Q",
  "eval_uids": ["5-1-1", "2-3-2"]
}
```

### PUT /api/v1/goals/:id
目標更新（進捗記録など）

### DELETE /api/v1/goals/:id
目標削除

---

## 評価（Evaluations）

### GET /api/v1/evaluation-items
評価項目マスタ一覧

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
      "two_year_rule": false
    }
  ]
}
```

### GET /api/v1/members/:id/evaluations/:year
指定年度の採点記録一覧

**Response**
```json
{
  "data": [
    {
      "eval_uid": "1-1-1",
      "item_name": "会社員としての基本姿勢",
      "self_score": "ryo",
      "self_reason": "日報、採用委員会での補助実施...",
      "manager_score": "ryo",
      "manager_reason": "採用業務を一次メンバーで対応可能になるよう..."
    }
  ]
}
```

### PUT /api/v1/members/:id/evaluations/:year/:uid
採点入力（自己 or 上長）

**Request**（本人の場合）
```json
{
  "self_score": "ryo",
  "self_reason": "日報を毎日記録し..."
}
```

**Request**（上長の場合）
```json
{
  "manager_score": "yu",
  "manager_reason": "採用委員長として..."
}
```

---

## ロール（Roles）

### GET /api/v1/roles
ロール一覧

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "classification": "engineer",
      "name": "server side engineer",
      "description": "サーバ/言語/フレームワークの特性に合わせたプログラム設計・実装する"
    }
  ]
}
```

### GET /api/v1/roles/:id/mappings
ロールに必要な評価項目マッピング一覧

**Response**
```json
{
  "data": [
    {
      "eval_uid": "2-3-3",
      "item_name": "サーバーサイドプログラミング能力",
      "necessity": "required",
      "required_level": "yu"
    }
  ]
}
```

### GET /api/v1/members/:id/roles/:year
社員のロール認定状況一覧

**Response**
```json
{
  "data": [
    {
      "role_name": "server side engineer",
      "judgment": "qualified",
      "qualified_count": 7,
      "total_count": 8
    }
  ]
}
```

---

## 配点（Allocations）

### GET /api/v1/allocations/:year
年度別・事業部別配点一覧（admin のみ）

### PUT /api/v1/allocations/:year
配点更新（admin のみ）

**Request**
```json
{
  "division": "観光",
  "items": [
    { "eval_uid": "1-1-1", "weight": 10 },
    { "eval_uid": "2-3-3", "weight": 20 }
  ]
}
```

---

## 月次実績（Monthly Records）

### GET /api/v1/members/:id/records/:year
年度の月次実績一覧

**Response**
```json
{
  "data": [
    {
      "record_month": "2025-01-01",
      "product": "DMO",
      "task": "データコネクトHUB（バッチ）",
      "done": true
    }
  ]
}
```

### PUT /api/v1/members/:id/records/:year/:month
月次実績の一括更新

**Request**
```json
{
  "records": [
    { "product": "DMO", "task": "データコネクトHUB（バッチ）", "done": true },
    { "product": "観光予報PF", "task": "Stripe対応", "done": false }
  ]
}
```
