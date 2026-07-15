import { z } from "zod";
import { errorResponseSchema } from "@/lib/schemas/common";
import {
  evaluationItemResponseSchema,
  evaluationItemsImportBodySchema,
  evaluationItemsImportResponseSchema,
} from "@/lib/schemas/evaluation-item";

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
      description:
        "EvalHub の外部 REST API。API キー（`Authorization: Bearer <api-key>`）で認証する。",
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
            200: jsonResponse("評価項目の一覧", {
              type: "object",
              properties: { evaluationItems: { type: "array", items: ref("EvaluationItem") } },
              required: ["evaluationItems"],
            }),
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
