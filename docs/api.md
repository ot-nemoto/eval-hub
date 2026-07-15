# api.md — 外部 REST API エンドポイント定義

## 概要

EvalHub のドメイン操作を UI を介さず実行するための外部 REST API。認証には API キー（Bearer トークン）を使用する。

フィールド単位の契約（型・必須・制約）は **アプリ内 API リファレンス（OpenAPI）を正とする**。本ドキュメントは認証・共通仕様・エラー契約・エンドポイント一覧・所在を扱い、フィールド定義は重複記載しない。

## API リファレンスの所在

| パス | 内容 | 認証 |
|------|------|------|
| `/api-reference` | Stoplight Elements による対話的 API リファレンス | ログイン必須（Clerk） |
| `/openapi.json` | OpenAPI 3.1 仕様（実行時生成・`servers` はアクセス元オリジン） | ログイン必須（Clerk） |

- 仕様は Zod スキーマ（`src/lib/schemas/`）を単一ソースとして `src/lib/openapi/document.ts` が生成する（手書き spec は持たない）。
- `info.version` は `package.json` を正とする。

## 認証

すべての `/api/*` エンドポイントで `Authorization` ヘッダーに Bearer トークンを付与する。

```
Authorization: Bearer <api_key>
```

- API キーはユーザー自身がヘッダーの個人設定モーダルから発行・失効する（発行のみ UI・ログイン必須）。API 経由でのキー発行は行わない。
- キーが無効・未一致、または対象ユーザーが `isActive: false` の場合は `401`。
- マスタ操作系は `role: ADMIN` 以外のユーザーは `403`。

## 共通仕様

- リクエスト・レスポンスとも JSON。
- CORS: `/api/*` は任意オリジンから利用可能（`Access-Control-Allow-Origin: *`）。プリフライト `OPTIONS` は `204`。
- Zod が受理する未知フィールドは無視される（strip）。

## エラーレスポンス定義

すべてのエラーはフラットな `{ error: string }` を返す。

```json
{ "error": "権限がありません" }
```

| HTTP ステータス | 発生条件 |
|--------------|---------|
| 400 | リクエストボディ・パラメータが不正（バリデーションエラー） |
| 401 | API キーが存在しない、または無効 |
| 403 | 必要な権限（ADMIN 等）がない |
| 404 | 対象リソースが存在しない |
| 409 | 一意制約違反（no 重複・同名重複など） |
| 500 | サーバー内部エラー |

## エンドポイント一覧

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| `GET` | `/api/evaluation-items` | 評価項目一覧の取得 | ADMIN |
| `POST` | `/api/evaluation-items` | 評価項目マスタの一括インポート（全削除→INSERT） | ADMIN |

> 以降のリソース（targets / categories / fiscal-years / eval-item-versions / evaluation-assignments / evaluation-settings / evaluations / users）は順次追加する。詳細は `/api-reference` を参照。

## クイックスタート

```bash
# 一覧取得
curl -H "Authorization: Bearer <api_key>" https://<host>/api/evaluation-items

# 一括インポート（大項目→中項目→評価項目の階層構造。index は送信順に自動採番）
curl -X POST https://<host>/api/evaluation-items \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '[{"no":1,"name":"社員","categories":[{"no":1,"name":"エンゲージメント","items":[{"no":1,"name":"評価項目A","description":"説明","evalCriteria":"基準"}]}]}]'
```

レスポンス例: 一覧は `{ "evaluationItems": [...] }`、インポートは `{ "created": <件数> }`。
