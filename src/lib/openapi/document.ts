import { z } from "zod";
import { errorResponseSchema } from "@/lib/schemas/common";
import {
  evaluationItemListResponseSchema,
  evaluationItemResponseSchema,
  evaluationItemsImportBodySchema,
  evaluationItemsImportResponseSchema,
} from "@/lib/schemas/evaluation-item";

/**
 * `info.description`（Markdown）に流し込む API 全体のナラティブ。
 * 認証・共通仕様・エラー契約・クイックスタートは spec を唯一の正とし、別途 docs/api.md は持たない。
 */
const API_DESCRIPTION = `EvalHub のドメイン操作を UI を介さず実行するための外部 REST API。

## 認証

すべての \`/api/*\` エンドポイントで \`Authorization\` ヘッダーに Bearer トークンを付与する。

\`\`\`
Authorization: Bearer <api_key>
\`\`\`

- API キーは個人設定モーダルから発行・失効する（発行のみ UI・ログイン必須）。API 経由でのキー発行は行わない。
- キーが無効・未一致、または対象ユーザーが \`isActive: false\` の場合は 401。
- マスタ操作系は \`role: ADMIN\` 以外のユーザーは 403。

## 共通仕様

- リクエスト・レスポンスとも JSON。
- CORS: \`/api/*\` は任意オリジンから利用可能（\`Access-Control-Allow-Origin: *\`）。プリフライト \`OPTIONS\` は 204。
- Zod が受理する未知フィールドは無視される（strip）。

## エラーレスポンス

すべてのエラーはフラットな \`{ "error": string }\` を返す。

| ステータス | 発生条件 |
|---|---|
| 400 | バリデーションエラー |
| 401 | API キーが存在しない／無効 |
| 403 | 権限（ADMIN 等）がない |
| 404 | 対象リソースが存在しない |
| 409 | 一意制約違反（no 重複など） |
| 500 | サーバー内部エラー |

## クイックスタート

\`\`\`bash
# 一覧取得
curl -H "Authorization: Bearer <api_key>" https://<host>/api/evaluation-items

# 一括インポート（大項目→中項目→評価項目。index は送信順に自動採番）
curl -X POST https://<host>/api/evaluation-items \\
  -H "Authorization: Bearer <api_key>" -H "Content-Type: application/json" \\
  -d '[{"no":1,"name":"社員","categories":[{"no":1,"name":"エンゲージメント","items":[{"no":1,"name":"評価項目A"}]}]}]'
\`\`\``;

/**
 * `additionalProperties` を再帰的に除去する。
 * Zod の `z.object()` は既定で strip（未知キーは受理して無視）だが `z.toJSONSchema()` は
 * `additionalProperties: false` を出力するため、これを残すと「未知フィールドは拒否」と読めて
 * 実サーバー挙動（受理して無視）と食い違う。仕様を実挙動に合わせるため除去する。
 */
function stripAdditionalProperties(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) stripAdditionalProperties(item);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    delete obj.additionalProperties;
    for (const value of Object.values(obj)) stripAdditionalProperties(value);
  }
}

/** Zod スキーマを OpenAPI 3.1（JSON Schema 2020-12）に変換する。`$schema`・`additionalProperties` は除去。 */
function toSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  stripAdditionalProperties(json);
  return json;
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/** JSON レスポンス定義。 */
const jsonResponse = (description: string, schema: object) => ({
  description,
  content: { "application/json": { schema } },
});

/** `{ error }` を返す 4xx レスポンス定義。 */
const errorResponse = (description: string) => jsonResponse(description, ref("Error"));

/** JSON リクエストボディ定義。 */
const jsonBody = (name: string) => ({
  required: true,
  content: { "application/json": { schema: ref(name) } },
});

/** OpenAPI 3.1 ドキュメントを組み立てる。`serverUrl`（アクセス元オリジン）があれば servers 先頭に置く。 */
export function buildOpenApiDocument(options: { version?: string; serverUrl?: string } = {}) {
  const localhost = "http://localhost:3000";
  // アクセス元オリジンが localhost（ポート違い含む）なら、固定の localhost 候補は紛らわしいので加えない。
  const originIsLocalhost = options.serverUrl
    ? new URL(options.serverUrl).hostname === "localhost"
    : false;
  const servers = [
    ...(options.serverUrl ? [{ url: options.serverUrl }] : []),
    ...(originIsLocalhost ? [] : [{ url: localhost, description: "ローカル開発" }]),
  ];
  return {
    openapi: "3.1.0",
    info: {
      title: "EvalHub API",
      version: options.version ?? "0.0.0",
      description: API_DESCRIPTION,
    },
    servers,
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "個人設定モーダルで発行した API キー（ADMIN 権限が必要）",
        },
      },
      schemas: {
        Error: toSchema(errorResponseSchema),
        EvaluationItem: toSchema(evaluationItemResponseSchema),
        EvaluationItemList: toSchema(evaluationItemListResponseSchema),
        EvaluationItemsImport: toSchema(evaluationItemsImportBodySchema),
        EvaluationItemsImportResult: toSchema(evaluationItemsImportResponseSchema),
      },
    },
    paths: {
      "/api/evaluation-items": {
        get: {
          summary: "評価項目一覧を取得",
          tags: ["evaluation-items"],
          responses: {
            200: jsonResponse("評価項目の一覧", ref("EvaluationItemList")),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
          },
        },
        post: {
          summary: "評価項目マスタを一括インポート（全削除→INSERT）",
          tags: ["evaluation-items"],
          requestBody: jsonBody("EvaluationItemsImport"),
          responses: {
            200: jsonResponse("作成件数", ref("EvaluationItemsImportResult")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            409: errorResponse("no が重複"),
          },
        },
      },
    },
  };
}
