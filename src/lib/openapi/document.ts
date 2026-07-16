import { z } from "zod";
import {
  categoryCreateBodySchema,
  categoryListResponseSchema,
  categoryResponseSchema,
  categoryUpdateBodySchema,
} from "@/lib/schemas/category";
import { errorResponseSchema, reorderBodySchema } from "@/lib/schemas/common";
import {
  evaluationAssignmentCreateBodySchema,
  evaluationAssignmentCreatedSchema,
  evaluationAssignmentListResponseSchema,
  evaluationAssignmentResponseSchema,
} from "@/lib/schemas/evaluation-assignment";
import {
  evaluationItemCreateBodySchema,
  evaluationItemListResponseSchema,
  evaluationItemResponseSchema,
  evaluationItemsImportBodySchema,
  evaluationItemsImportResponseSchema,
  evaluationItemUpdateBodySchema,
} from "@/lib/schemas/evaluation-item";
import {
  evaluationSettingListResponseSchema,
  evaluationSettingResponseSchema,
  evaluationSettingUpsertBodySchema,
} from "@/lib/schemas/evaluation-setting";
import {
  fiscalYearCreateBodySchema,
  fiscalYearListResponseSchema,
  fiscalYearLockBodySchema,
  fiscalYearResponseSchema,
  fiscalYearUpdateBodySchema,
} from "@/lib/schemas/fiscal-year";
import {
  targetCreateBodySchema,
  targetListResponseSchema,
  targetResponseSchema,
  targetUpdateBodySchema,
} from "@/lib/schemas/target";

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

/** 整数 ID の path パラメータ定義。 */
const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer" },
  description: "対象リソースの ID",
};

/** 年度（PK）の path パラメータ定義。 */
const yearParam = {
  name: "year",
  in: "path",
  required: true,
  schema: { type: "integer" },
  description: "対象年度（例: 2025）",
};

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
        ReorderBody: toSchema(reorderBodySchema),
        EvaluationItem: toSchema(evaluationItemResponseSchema),
        EvaluationItemList: toSchema(evaluationItemListResponseSchema),
        EvaluationItemCreate: toSchema(evaluationItemCreateBodySchema),
        EvaluationItemUpdate: toSchema(evaluationItemUpdateBodySchema),
        EvaluationItemsImport: toSchema(evaluationItemsImportBodySchema),
        EvaluationItemsImportResult: toSchema(evaluationItemsImportResponseSchema),
        Target: toSchema(targetResponseSchema),
        TargetList: toSchema(targetListResponseSchema),
        TargetCreate: toSchema(targetCreateBodySchema),
        TargetUpdate: toSchema(targetUpdateBodySchema),
        Category: toSchema(categoryResponseSchema),
        CategoryList: toSchema(categoryListResponseSchema),
        CategoryCreate: toSchema(categoryCreateBodySchema),
        CategoryUpdate: toSchema(categoryUpdateBodySchema),
        FiscalYear: toSchema(fiscalYearResponseSchema),
        FiscalYearList: toSchema(fiscalYearListResponseSchema),
        FiscalYearCreate: toSchema(fiscalYearCreateBodySchema),
        FiscalYearUpdate: toSchema(fiscalYearUpdateBodySchema),
        FiscalYearLock: toSchema(fiscalYearLockBodySchema),
        EvaluationAssignment: toSchema(evaluationAssignmentResponseSchema),
        EvaluationAssignmentList: toSchema(evaluationAssignmentListResponseSchema),
        EvaluationAssignmentCreate: toSchema(evaluationAssignmentCreateBodySchema),
        EvaluationAssignmentCreated: toSchema(evaluationAssignmentCreatedSchema),
        EvaluationSetting: toSchema(evaluationSettingResponseSchema),
        EvaluationSettingList: toSchema(evaluationSettingListResponseSchema),
        EvaluationSettingUpsert: toSchema(evaluationSettingUpsertBodySchema),
      },
    },
    paths: {
      "/api/evaluation-items": {
        get: {
          summary: "評価項目一覧を取得",
          tags: ["evaluation-items"],
          parameters: [
            {
              name: "targetId",
              in: "query",
              required: false,
              schema: { type: "integer" },
              description: "大分類 ID で絞り込む",
            },
            {
              name: "categoryId",
              in: "query",
              required: false,
              schema: { type: "integer" },
              description: "中分類 ID で絞り込む",
            },
          ],
          responses: {
            200: jsonResponse("評価項目の一覧", ref("EvaluationItemList")),
            400: errorResponse("クエリ不正"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
          },
        },
        post: {
          summary: "評価項目を作成",
          tags: ["evaluation-items"],
          requestBody: jsonBody("EvaluationItemCreate"),
          responses: {
            201: jsonResponse("作成された評価項目", ref("EvaluationItem")),
            400: errorResponse("バリデーションエラー / categoryId が targetId と不整合"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("指定した大分類・中分類が未存在"),
            409: errorResponse("no 重複"),
          },
        },
      },
      "/api/evaluation-items/import": {
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
      "/api/evaluation-items/reorder": {
        post: {
          summary: "評価項目の表示順を一括更新",
          tags: ["evaluation-items"],
          requestBody: jsonBody("ReorderBody"),
          responses: {
            204: { description: "並び替え成功（ボディなし）" },
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("並び替え対象が未存在"),
          },
        },
      },
      "/api/evaluation-items/{id}": {
        patch: {
          summary: "評価項目を更新",
          tags: ["evaluation-items"],
          parameters: [idParam],
          requestBody: jsonBody("EvaluationItemUpdate"),
          responses: {
            200: jsonResponse("更新後の評価項目", ref("EvaluationItem")),
            400: errorResponse("バリデーションエラー / 更新フィールドなし"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("未存在"),
            409: errorResponse("no 重複"),
          },
        },
        delete: {
          summary: "評価項目を削除",
          tags: ["evaluation-items"],
          parameters: [idParam],
          responses: {
            204: { description: "削除成功（ボディなし）" },
            400: errorResponse("id 不正"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("未存在"),
          },
        },
      },
      "/api/targets": {
        get: {
          summary: "大分類一覧を取得",
          tags: ["targets"],
          responses: {
            200: jsonResponse("大分類の一覧", ref("TargetList")),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
          },
        },
        post: {
          summary: "大分類を作成",
          tags: ["targets"],
          requestBody: jsonBody("TargetCreate"),
          responses: {
            201: jsonResponse("作成された大分類", ref("Target")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            409: errorResponse("no 重複"),
          },
        },
      },
      "/api/targets/reorder": {
        post: {
          summary: "大分類の表示順を一括更新",
          tags: ["targets"],
          requestBody: jsonBody("ReorderBody"),
          responses: {
            204: { description: "並び替え成功（ボディなし）" },
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("並び替え対象が未存在"),
          },
        },
      },
      "/api/targets/{id}": {
        patch: {
          summary: "大分類を更新（名称・no）",
          tags: ["targets"],
          parameters: [idParam],
          requestBody: jsonBody("TargetUpdate"),
          responses: {
            200: jsonResponse("更新後の大分類", ref("Target")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("未存在"),
            409: errorResponse("no 重複"),
          },
        },
        delete: {
          summary: "大分類を削除",
          tags: ["targets"],
          parameters: [idParam],
          responses: {
            204: { description: "削除成功（ボディなし）" },
            400: errorResponse("id 不正"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("未存在"),
            409: errorResponse("紐づく中分類が存在"),
          },
        },
      },
      "/api/categories": {
        get: {
          summary: "中分類一覧を取得",
          tags: ["categories"],
          parameters: [
            {
              name: "targetId",
              in: "query",
              required: false,
              schema: { type: "integer" },
              description: "指定した大分類 ID で絞り込む",
            },
          ],
          responses: {
            200: jsonResponse("中分類の一覧", ref("CategoryList")),
            400: errorResponse("targetId 不正"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
          },
        },
        post: {
          summary: "中分類を作成",
          tags: ["categories"],
          requestBody: jsonBody("CategoryCreate"),
          responses: {
            201: jsonResponse("作成された中分類", ref("Category")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("指定した targetId の大分類が未存在"),
            409: errorResponse("no 重複"),
          },
        },
      },
      "/api/categories/reorder": {
        post: {
          summary: "中分類の表示順を一括更新",
          tags: ["categories"],
          requestBody: jsonBody("ReorderBody"),
          responses: {
            204: { description: "並び替え成功（ボディなし）" },
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("並び替え対象が未存在"),
          },
        },
      },
      "/api/categories/{id}": {
        patch: {
          summary: "中分類を更新（名称・no）",
          tags: ["categories"],
          parameters: [idParam],
          requestBody: jsonBody("CategoryUpdate"),
          responses: {
            200: jsonResponse("更新後の中分類", ref("Category")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("未存在"),
            409: errorResponse("no 重複"),
          },
        },
        delete: {
          summary: "中分類を削除",
          tags: ["categories"],
          parameters: [idParam],
          responses: {
            204: { description: "削除成功（ボディなし）" },
            400: errorResponse("id 不正"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("未存在"),
            409: errorResponse("紐づく評価項目が存在"),
          },
        },
      },
      "/api/fiscal-years": {
        get: {
          summary: "年度一覧を取得",
          tags: ["fiscal-years"],
          responses: {
            200: jsonResponse("年度の一覧", ref("FiscalYearList")),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
          },
        },
        post: {
          summary: "年度を作成",
          tags: ["fiscal-years"],
          requestBody: jsonBody("FiscalYearCreate"),
          responses: {
            201: jsonResponse("作成された年度", ref("FiscalYear")),
            400: errorResponse("バリデーションエラー（year 範囲・日付・期間前後）"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            409: errorResponse("同じ年度が既に存在"),
          },
        },
      },
      "/api/fiscal-years/{year}": {
        patch: {
          summary: "年度を更新（名称・期間・現在年度フラグ）",
          tags: ["fiscal-years"],
          parameters: [yearParam],
          requestBody: jsonBody("FiscalYearUpdate"),
          responses: {
            200: jsonResponse("更新後の年度", ref("FiscalYear")),
            400: errorResponse("バリデーションエラー / 更新フィールドなし"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("未存在"),
          },
        },
        delete: {
          summary: "年度を削除",
          tags: ["fiscal-years"],
          parameters: [yearParam],
          responses: {
            204: { description: "削除成功（ボディなし）" },
            400: errorResponse("year 不正"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("未存在"),
            409: errorResponse("紐づくデータが存在"),
          },
        },
      },
      "/api/fiscal-years/{year}/lock": {
        post: {
          summary: "年度のロック状態を設定",
          tags: ["fiscal-years"],
          parameters: [yearParam],
          requestBody: jsonBody("FiscalYearLock"),
          responses: {
            200: jsonResponse("更新後の年度", ref("FiscalYear")),
            400: errorResponse("バリデーションエラー / year 不正"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("未存在"),
          },
        },
      },
      "/api/evaluation-assignments": {
        get: {
          summary: "評価者アサイン一覧を取得",
          tags: ["evaluation-assignments"],
          parameters: [
            {
              name: "fiscalYear",
              in: "query",
              required: false,
              schema: { type: "integer" },
              description: "年度で絞り込む",
            },
            {
              name: "evaluateeId",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "被評価者 ID で絞り込む",
            },
          ],
          responses: {
            200: jsonResponse("アサインの一覧", ref("EvaluationAssignmentList")),
            400: errorResponse("クエリ不正"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
          },
        },
        post: {
          summary: "評価者アサインを作成",
          tags: ["evaluation-assignments"],
          requestBody: jsonBody("EvaluationAssignmentCreate"),
          responses: {
            201: jsonResponse("作成されたアサイン", ref("EvaluationAssignmentCreated")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            409: errorResponse("同一年度・被評価者・評価者の組み合わせが既に存在"),
          },
        },
      },
      "/api/evaluation-assignments/{id}": {
        delete: {
          summary: "評価者アサインを削除",
          tags: ["evaluation-assignments"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "アサイン ID（UUID）",
            },
          ],
          responses: {
            204: { description: "削除成功（ボディなし）" },
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("未存在"),
          },
        },
      },
      "/api/evaluation-settings": {
        get: {
          summary: "ユーザーの自己評価要否設定一覧を取得",
          tags: ["evaluation-settings"],
          parameters: [
            {
              name: "userId",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "対象ユーザー ID",
            },
          ],
          responses: {
            200: jsonResponse("年度別設定の一覧", ref("EvaluationSettingList")),
            400: errorResponse("userId 未指定"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("ユーザー未存在"),
          },
        },
        post: {
          summary: "自己評価要否設定を作成/更新（upsert）",
          tags: ["evaluation-settings"],
          requestBody: jsonBody("EvaluationSettingUpsert"),
          responses: {
            200: jsonResponse("upsert 後の設定", ref("EvaluationSetting")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 権限が必要"),
            404: errorResponse("ユーザー未存在"),
          },
        },
      },
    },
  };
}
