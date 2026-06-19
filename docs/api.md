# api.md — 外部 REST API エンドポイント定義

## 概要

評価項目マスタデータを外部から登録・取得するための REST API。

認証には API キー（Bearer トークン）を使用する。キーはユーザー自身がヘッダーの個人設定モーダルから発行・失効する（ADMIN 権限が必要）。

## 認証

すべてのエンドポイントで `Authorization` ヘッダーに Bearer トークンを付与する。

```
Authorization: Bearer <api_key>
```

- 対象ユーザーが `isActive: false` の場合は `401 Unauthorized`
- `role: ADMIN` 以外のユーザーは `403 Forbidden`

## エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/evaluation-items` | 評価項目一覧の取得 |
| `POST` | `/api/evaluation-items` | 評価項目の一括登録（upsert） |

---

## GET /api/evaluation-items

評価項目を全件取得する。

### レスポンス（200）

```json
{
  "data": [
    {
      "id": 1,
      "no": 1,
      "name": "評価項目A",
      "description": "説明",
      "evalCriteria": "基準",
      "target": { "id": 1, "no": 1, "name": "社員" },
      "category": { "id": 1, "no": 1, "name": "エンゲージメント" }
    }
  ],
  "meta": { "total": 1 }
}
```

---

## POST /api/evaluation-items

大項目（Target）→ 中項目（Category）→ 評価項目（EvaluationItem）の階層構造で一括 upsert する。
`no` をキーとして既存データを更新し、存在しない場合は新規作成する。

### リクエストボディ

```json
[
  {
    "no": 1,
    "name": "社員",
    "categories": [
      {
        "no": 1,
        "name": "エンゲージメント",
        "items": [
          {
            "no": 1,
            "name": "評価項目A",
            "description": "説明（任意）",
            "evalCriteria": "基準（任意）"
          }
        ]
      }
    ]
  }
]
```

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `no` | number | ✓ | upsert キー（大項目は全体でユニーク、中項目は大項目内でユニーク、評価項目は中項目内でユニーク） |
| `name` | string | ✓ | 名称 |
| `description` | string \| null | — | 説明（評価項目のみ） |
| `evalCriteria` | string \| null | — | 評価基準（評価項目のみ） |

### レスポンス（200）

```json
{
  "data": { "upserted": 3 },
  "meta": {
    "items": [
      { "targetNo": 1, "categoryNo": 1, "itemNo": 1, "name": "評価項目A" }
    ]
  }
}
```

---

## エラーレスポンス定義

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "API キーが無効です"
  }
}
```

| HTTP ステータス | code | 発生条件 |
|--------------|------|---------|
| 400 | `BAD_REQUEST` | リクエストボディが不正（必須フィールド欠落など） |
| 401 | `UNAUTHORIZED` | API キーが存在しない、または無効 |
| 403 | `FORBIDDEN` | ADMIN ロール以外のユーザー |
| 500 | `INTERNAL_SERVER_ERROR` | サーバー内部エラー |
