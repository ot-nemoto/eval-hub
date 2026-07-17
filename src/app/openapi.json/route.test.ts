// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /openapi.json", () => {
  it("OpenAPI 3.1 ドキュメントを JSON で返す", async () => {
    const res = GET(new Request("https://eval-hub.example/openapi.json"));
    const body = await res.json();

    expect(res.headers.get("content-type")).toContain("application/json");
    expect(body.openapi).toBe("3.1.0");
    expect(body.paths["/api/evaluation-items"]).toBeDefined();
  });

  it("servers 先頭にリクエストのオリジンを反映する", async () => {
    const res = GET(new Request("https://eval-hub.example/openapi.json"));
    const body = await res.json();

    expect(body.servers[0].url).toBe("https://eval-hub.example");
  });
});
