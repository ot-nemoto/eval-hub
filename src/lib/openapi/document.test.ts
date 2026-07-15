// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "./document";

const doc = buildOpenApiDocument({ version: "9.9.9" });

const EXPECTED_PATHS = ["/api/evaluation-items"];

const HTTP_METHODS = ["get", "post", "patch", "put", "delete"];

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
    expect(opCount).toBe(2);
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
        "EvaluationItem",
        "EvaluationItemList",
        "EvaluationItemsImport",
        "EvaluationItemsImportResult",
      ]),
    );
  });

  it("components.schemas に additionalProperties を残さない（実サーバーの strip 挙動と整合）", () => {
    expect(JSON.stringify(doc.components.schemas)).not.toContain("additionalProperties");
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
