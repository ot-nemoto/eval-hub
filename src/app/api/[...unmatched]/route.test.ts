// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, POST } from "./route";

describe("実在しない /api/* パスのキャッチオール", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["GET", GET],
    ["POST", POST],
    ["DELETE", DELETE],
  ])("正常系: %s は { error } 形式の 404 を返す", async (_label, handler) => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await handler(
      new Request("https://example.com/api/evaluations/abc123/export", { method: "GET" }),
    );

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Not Found" });
  });

  // この経路が無記録だったことが T234 の穴そのもの。
  // 既知のリソース配下を探る形が列挙としては最も現実的。
  it("正常系: 監査ログに記録される", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await GET(new Request("https://example.com/api/evaluations/abc123/export"));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({
      type: "audit",
      method: "GET",
      path: "/api/evaluations/abc123/export",
      status: 404,
    });
  });

  // 全 export が同じ notFound 関数なので、メソッドごとに呼んでも検証力が無い
  // （実測: PUT の export を消しても route.test.ts / route-wrapping.test.ts は green のまま。
  // Next はルーティング段で 405 を返し監査ログも残らないため、そのメソッドで穴が再発する）。
  // export の集合そのものを固定する。
  it("境界値: 想定した全メソッドを export する（1 つ消すとそのメソッドで穴が再発する）", async () => {
    const mod = await import("./route");

    expect(Object.keys(mod).sort()).toEqual(["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT"]);
  });

  // proxy.ts が isApiRoute 一致時の OPTIONS を 204 で返すため到達しない。
  it("境界値: OPTIONS は export しない（proxy.ts が先に 204 を返すため到達しない）", async () => {
    const mod = await import("./route");

    expect("OPTIONS" in mod).toBe(false);
  });
});
