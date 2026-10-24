// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "./document";

const doc = buildOpenApiDocument({ version: "9.9.9" });

const EXPECTED_PATHS = [
  "/api/evaluation-items",
  "/api/evaluation-items/import",
  "/api/evaluation-items/reorder",
  "/api/evaluation-items/{id}",
  "/api/targets",
  "/api/targets/reorder",
  "/api/targets/{id}",
  "/api/categories",
  "/api/categories/reorder",
  "/api/categories/{id}",
  "/api/fiscal-years",
  "/api/fiscal-years/{year}",
  "/api/fiscal-years/{year}/lock",
  "/api/evaluation-assignments",
  "/api/evaluation-assignments/{id}",
  "/api/evaluation-settings",
  "/api/evaluations",
  "/api/evaluations/matrix",
  "/api/evaluations/progress",
  "/api/evaluations/self",
  "/api/evaluations/manager",
  "/api/evaluations/self-score",
  "/api/evaluations/manager-score",
  "/api/evaluations/comments",
  "/api/evaluations/comments/{id}",
  "/api/users",
  "/api/users/{id}",
  "/api/eval-item-versions",
  "/api/eval-item-versions/current",
  "/api/eval-item-versions/{id}",
  "/api/eval-item-versions/{id}/restore",
  "/api/fiscal-years/{year}/version",
];

const HTTP_METHODS = ["get", "post", "patch", "put", "delete"];

/**
 * 操作ごとに宣言するステータス集合。`"METHOD /path"` をキーにする
 * （本リポジトリの spec は `operationId` を持たないため）。
 *
 * これは**列挙**で、spec に無いステータスを見つける検査ではない。狙いは回帰の防止:
 * ステータスを足す/消すときにこの表の更新を強制し、**無言の変更を起こさせない**。
 * キー集合は下の検査で spec と双方向に一致させる。
 *
 * **この表は spec と実装のズレを、どちらの向きにも検出しない。** 表と spec が一致して
 * いれば通るため、両方に同じ嘘を書けばその嘘が固定される。
 *
 * - 過剰な宣言（返りえないステータスを宣言する）: reorder の 409 は `index` に一意制約が
 *   無く `P2002` が発生しえないのに宣言されていた（T235 で撤去）
 * - 過少な宣言（返るステータスを宣言しない）: reorder の 404 を spec と表の両方から消す
 *   変異は全テスト green のまま通る（T235 のレビューで実測）。**こちらの方が害が大きい**
 *
 * つまりこの表が守るのは「片側だけ更新したこと」だけで、**宣言の正しさは一切保証しない**。
 * ステータスを足す/消すときは、実装・スキーマの側にその経路が本当にあるかを自分で確かめる。
 * 実装から導出する検査（ルートテストで観測したステータスと突き合わせる等）が別途必要。
 */
const EXPECTED_STATUS: Record<string, string[]> = {
  "GET /api/evaluation-items": ["200", "400", "401", "403", "500"],
  "POST /api/evaluation-items": ["201", "400", "401", "403", "404", "409", "500"],
  "POST /api/evaluation-items/import": ["200", "400", "401", "403", "409", "500"],
  "POST /api/evaluation-items/reorder": ["204", "400", "401", "403", "404", "500"],
  "PATCH /api/evaluation-items/{id}": ["200", "400", "401", "403", "404", "409", "500"],
  "DELETE /api/evaluation-items/{id}": ["204", "400", "401", "403", "404", "500"],
  "GET /api/targets": ["200", "401", "403", "500"],
  "POST /api/targets": ["201", "400", "401", "403", "409", "500"],
  "POST /api/targets/reorder": ["204", "400", "401", "403", "404", "500"],
  "PATCH /api/targets/{id}": ["200", "400", "401", "403", "404", "409", "500"],
  "DELETE /api/targets/{id}": ["204", "400", "401", "403", "404", "409", "500"],
  "GET /api/categories": ["200", "400", "401", "403", "500"],
  "POST /api/categories": ["201", "400", "401", "403", "404", "409", "500"],
  "POST /api/categories/reorder": ["204", "400", "401", "403", "404", "500"],
  "PATCH /api/categories/{id}": ["200", "400", "401", "403", "404", "409", "500"],
  "DELETE /api/categories/{id}": ["204", "400", "401", "403", "404", "409", "500"],
  "GET /api/fiscal-years": ["200", "401", "403", "500"],
  "POST /api/fiscal-years": ["201", "400", "401", "403", "409", "500"],
  "PATCH /api/fiscal-years/{year}": ["200", "400", "401", "403", "404", "500"],
  "DELETE /api/fiscal-years/{year}": ["204", "400", "401", "403", "404", "409", "500"],
  "POST /api/fiscal-years/{year}/lock": ["200", "400", "401", "403", "404", "500"],
  "GET /api/evaluation-assignments": ["200", "400", "401", "403", "500"],
  "POST /api/evaluation-assignments": ["201", "400", "401", "403", "404", "409", "500"],
  "DELETE /api/evaluation-assignments/{id}": ["204", "401", "403", "404", "500"],
  "GET /api/evaluation-settings": ["200", "400", "401", "403", "404", "500"],
  "POST /api/evaluation-settings": ["200", "400", "401", "403", "404", "500"],
  "GET /api/evaluations": ["200", "400", "401", "403", "500"],
  "GET /api/evaluations/matrix": ["200", "400", "401", "403", "500"],
  "GET /api/evaluations/progress": ["200", "400", "401", "403", "500"],
  "GET /api/evaluations/self": ["200", "400", "401", "403", "500"],
  "GET /api/evaluations/manager": ["200", "400", "401", "403", "500"],
  "POST /api/evaluations/self-score": ["200", "400", "401", "403", "404", "500"],
  "POST /api/evaluations/manager-score": ["200", "400", "401", "403", "404", "500"],
  "POST /api/evaluations/comments": ["201", "400", "401", "403", "404", "500"],
  "PATCH /api/evaluations/comments/{id}": ["200", "400", "401", "403", "404", "500"],
  "DELETE /api/evaluations/comments/{id}": ["204", "401", "403", "404", "500"],
  "GET /api/users": ["200", "401", "403", "500"],
  "PATCH /api/users/{id}": ["200", "400", "401", "403", "404", "500"],
  "DELETE /api/users/{id}": ["204", "401", "403", "404", "409", "500"],
  "GET /api/eval-item-versions": ["200", "401", "403", "500"],
  "POST /api/eval-item-versions": ["201", "400", "401", "403", "500"],
  "GET /api/eval-item-versions/current": ["200", "401", "403", "500"],
  "GET /api/eval-item-versions/{id}": ["200", "400", "401", "403", "404", "500"],
  "DELETE /api/eval-item-versions/{id}": ["204", "400", "401", "403", "404", "409", "500"],
  "POST /api/eval-item-versions/{id}/restore": ["204", "400", "401", "403", "404", "500"],
  "POST /api/fiscal-years/{year}/version": ["200", "400", "401", "403", "404", "409", "500"],
  "DELETE /api/fiscal-years/{year}/version": ["204", "400", "401", "403", "404", "409", "500"],
};

describe("buildOpenApiDocument", () => {
  it("OpenAPI 3.1・version・security scheme（Bearer）", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info.title).toBeTruthy();
    expect(doc.info.version).toBe("9.9.9");
    expect(doc.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
    expect(doc.security).toEqual([{ bearerAuth: [] }]);
  });

  it("serverUrl（オリジン）を渡すと servers 先頭に入り、localhost が続く（未指定は localhost のみ）", () => {
    const withServer = buildOpenApiDocument({
      version: "1.0.0",
      serverUrl: "https://api.example.com",
    });
    expect(withServer.servers).toEqual([
      { url: "https://api.example.com" },
      { url: "http://localhost:3000", description: "ローカル開発" },
    ]);

    expect(doc.servers).toEqual([{ url: "http://localhost:3000", description: "ローカル開発" }]);
  });

  it("serverUrl が localhost（ポート違い含む）のときは servers を重複させない", () => {
    const local = buildOpenApiDocument({ version: "1.0.0", serverUrl: "http://localhost:3000" });
    expect(local.servers).toEqual([{ url: "http://localhost:3000" }]);

    const otherPort = buildOpenApiDocument({
      version: "1.0.0",
      serverUrl: "http://localhost:3001",
    });
    expect(otherPort.servers).toEqual([{ url: "http://localhost:3001" }]);
  });

  it("全エンドポイントが含まれる", () => {
    expect(Object.keys(doc.paths).sort()).toEqual([...EXPECTED_PATHS].sort());

    const opCount = Object.values(doc.paths).reduce(
      (n, item) => n + Object.keys(item).filter((k) => HTTP_METHODS.includes(k)).length,
      0,
    );
    expect(opCount).toBe(47);
  });

  it("各オペレーションに summary と responses がある", () => {
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(item as Record<string, unknown>)) {
        if (!HTTP_METHODS.includes(method)) continue;
        const operation = op as { summary?: string; responses?: Record<string, unknown> };
        expect(operation.summary, `${method} ${path} summary`).toBeTruthy();
        expect(
          Object.keys(operation.responses ?? {}).length,
          `${method} ${path} responses`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("components.schemas に主要スキーマがある", () => {
    expect(Object.keys(doc.components.schemas)).toEqual(
      expect.arrayContaining([
        "Error",
        "ReorderBody",
        "EvaluationItem",
        "EvaluationItemList",
        "EvaluationItemCreate",
        "EvaluationItemUpdate",
        "EvaluationItemsImport",
        "EvaluationItemsImportResult",
        "Target",
        "TargetList",
        "TargetCreate",
        "TargetUpdate",
        "Category",
        "CategoryList",
        "CategoryCreate",
        "CategoryUpdate",
        "FiscalYear",
        "FiscalYearList",
        "FiscalYearCreate",
        "FiscalYearUpdate",
        "FiscalYearLock",
        "EvaluationAssignment",
        "EvaluationAssignmentList",
        "EvaluationAssignmentCreate",
        "EvaluationAssignmentCreated",
        "EvaluationSetting",
        "EvaluationSettingList",
        "EvaluationSettingUpsert",
        "EvaluationDetail",
        "EvaluationMatrix",
        "EvaluationProgress",
        "SelfEvaluationList",
        "ManagerEvaluationList",
        "EvaluationSelfUpsert",
        "EvaluationSelfUpsertResult",
        "EvaluationManagerScore",
        "EvaluationManagerScoreResult",
        "EvaluationCommentCreate",
        "EvaluationCommentUpdate",
        "ManagerComment",
        "UserList",
        "UserUpdate",
        "UserUpdateResult",
        "EvalItemVersionList",
        "EvalItemVersionDetail",
        "EvalItemVersionCreate",
        "EvalItemVersionCreated",
        "CurrentEvalItems",
        "VersionAssign",
        "VersionAssignResult",
      ]),
    );
  });

  it("components.schemas に additionalProperties を残さない（実サーバーの strip 挙動と整合）", () => {
    expect(JSON.stringify(doc.components.schemas)).not.toContain("additionalProperties");
  });

  // 共通ラッパー（withApiErrorHandling）が捕捉されない例外を 500 { error } に変換するため、
  // 全 operation が 500 を返しうる。配信 spec を仕様の唯一の正とするため spec にも載せる。
  it("全 operation が 500 を定義する（サーバー側の失敗も spec に載せる）", () => {
    const { paths } = buildOpenApiDocument();
    let checked = 0;
    for (const [path, item] of Object.entries(paths)) {
      for (const [method, op] of Object.entries(item as Record<string, unknown>)) {
        // path item 階層には parameters・summary など operation 以外のキーも置ける
        // （同ファイル内の他のループと同じくフィルタする。無いと偽陽性で落ちる）。
        if (!HTTP_METHODS.includes(method)) continue;
        const o = op as { responses?: Record<string, unknown> };
        checked += 1;
        expect(o.responses?.["500"], `${method.toUpperCase()} ${path} に 500 が無い`).toBeTruthy();
      }
    }
    // 走査の起点を誤ると 1 件も検査せずに通るため、0 件での成功を禁じる。
    expect(checked).toBeGreaterThan(0);
  });

  // 操作ごとのステータス集合を双方向で固定する。片方向だと、表の更新を忘れた操作が
  // 検査対象から外れて素通りする。
  it("操作ごとに宣言するステータス集合が EXPECTED_STATUS と一致する", () => {
    const { paths } = buildOpenApiDocument();
    const actual: Record<string, string[]> = {};
    for (const [path, item] of Object.entries(paths)) {
      for (const [method, op] of Object.entries(item as Record<string, unknown>)) {
        if (!HTTP_METHODS.includes(method)) continue;
        const o = op as { responses: Record<string, unknown> };
        actual[`${method.toUpperCase()} ${path}`] = Object.keys(o.responses).sort();
      }
    }
    expect(Object.keys(actual).sort()).toEqual(Object.keys(EXPECTED_STATUS).sort());
    for (const [key, codes] of Object.entries(actual)) {
      expect(codes, key).toEqual([...EXPECTED_STATUS[key]].sort());
    }
  });

  // 500 の「有無」だけを見る検査では、ボディ定義が落ちた 500・別スキーマを指す 500 を
  // 見逃す（$ref 解決の検査は参照先が存在すれば通る）。守りたいのは「全エラーが { error }」
  // という契約そのものなので、スキーマを完全一致で固定する。
  it("全 4xx / 5xx のボディが共通の Error スキーマを指す", () => {
    const { paths } = buildOpenApiDocument();
    let checked = 0;
    for (const [path, item] of Object.entries(paths)) {
      for (const [method, op] of Object.entries(item as Record<string, unknown>)) {
        if (!HTTP_METHODS.includes(method)) continue;
        const o = op as {
          responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
        };
        for (const [status, res] of Object.entries(o.responses ?? {})) {
          if (Number(status) < 400) continue;
          checked += 1;
          expect(
            res.content?.["application/json"]?.schema,
            `${method.toUpperCase()} ${path} の ${status}`,
          ).toEqual({ $ref: "#/components/schemas/Error" });
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  // 実装（unauthorized()）が返す WWW-Authenticate を spec にも載せる。
  // 配信 spec を仕様の唯一の正とするため、片方だけ消えるのを防ぐ。
  it("401 を定義する全 operation が WWW-Authenticate ヘッダを宣言する", () => {
    const { paths } = buildOpenApiDocument();
    let checked = 0;
    for (const [path, item] of Object.entries(paths)) {
      for (const [method, op] of Object.entries(item as Record<string, unknown>)) {
        if (!HTTP_METHODS.includes(method)) continue;
        const o = op as { responses?: Record<string, { headers?: Record<string, unknown> }> };
        if (!o.responses?.["401"]) continue;
        checked += 1;
        expect(
          o.responses["401"].headers?.["WWW-Authenticate"],
          `${method.toUpperCase()} ${path} の 401 に WWW-Authenticate が無い`,
        ).toBeTruthy();
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("全 $ref が components.schemas に解決できる（参照切れなし）", () => {
    const refs = [...JSON.stringify(doc).matchAll(/"#\/components\/schemas\/([A-Za-z0-9]+)"/g)].map(
      (m) => m[1],
    );
    const defined = new Set(Object.keys(doc.components.schemas));
    expect(refs.length).toBeGreaterThan(0);
    for (const name of refs) {
      expect(defined.has(name), `未定義スキーマ参照: ${name}`).toBe(true);
    }
  });
});
