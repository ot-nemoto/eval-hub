// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildAuditRecord, logAudit, setAuditUserId } from "./auditLog";

function req(
  url = "https://example.com/api/items",
  init: RequestInit & { headers?: Record<string, string> } = {},
) {
  return new Request(url, { method: "GET", ...init });
}

describe("buildAuditRecord", () => {
  it("正常系: メソッド・パス・クエリ・ステータスを記録する", () => {
    const r = buildAuditRecord(
      req("https://example.com/api/items?page=2&q=abc", { method: "PATCH" }),
      200,
    );

    expect(r).toMatchObject({
      type: "audit",
      userId: null,
      method: "PATCH",
      path: "/api/items",
      query: "?page=2&q=abc",
      status: 200,
      ip: null,
    });
    expect(r.at).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
  });

  it("正常系: setAuditUserId で渡したユーザーを紐づける", () => {
    const r1 = req();
    setAuditUserId(r1, "user-1");

    expect(buildAuditRecord(r1, 200).userId).toBe("user-1");
    // 別インスタンスには漏れない（WeakMap のキーは Request 単位）
    expect(buildAuditRecord(req(), 200).userId).toBeNull();
  });

  it("正常系: x-forwarded-for の先頭を IP とする", () => {
    const r = buildAuditRecord(
      req("https://example.com/api/me", {
        headers: { "x-forwarded-for": "203.0.113.1, 70.41.3.18, 150.172.238.178" },
      }),
      200,
    );

    expect(r.ip).toBe("203.0.113.1");
  });

  it("正常系: x-forwarded-for が無ければ x-real-ip を使う", () => {
    const r = buildAuditRecord(
      req("https://example.com/api/me", { headers: { "x-real-ip": "198.51.100.7" } }),
      200,
    );

    expect(r.ip).toBe("198.51.100.7");
  });

  it("正常系: content-length をバイト数として記録する", () => {
    const r = buildAuditRecord(
      req("https://example.com/api/items", {
        method: "POST",
        headers: { "content-length": "4096" },
      }),
      200,
    );

    expect(r.bytes).toBe(4096);
  });

  it("境界値: content-length が無ければ null", () => {
    expect(buildAuditRecord(req(), 200).bytes).toBeNull();
  });

  it("異常系: content-length が数値でなければ null", () => {
    const r = buildAuditRecord(
      req("https://example.com/api/me", { headers: { "content-length": "abc" } }),
      200,
    );

    expect(r.bytes).toBeNull();
  });

  it("境界値: クエリが無ければ空文字", () => {
    expect(buildAuditRecord(req(), 200).query).toBe("");
  });

  // 「誰のキーで」を userId で表すため、キー自体は記録しない。
  // 記録してしまうと、ログの保存先がキーの保管場所になってしまう。
  it("異常系: Authorization ヘッダの APIキーを記録しない", () => {
    const secret = "eh_SUPERSECRETKEYVALUE00000000000000000000";
    const r = buildAuditRecord(
      req("https://example.com/api/items", {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      }),
      201,
    );

    expect(JSON.stringify(r)).not.toContain(secret);
  });

  it("異常系: リクエストボディを記録しない", () => {
    const body = "記録されてはいけない本文";
    const r = buildAuditRecord(
      new Request("https://example.com/api/items", { method: "POST", body }),
      201,
    );

    expect(JSON.stringify(r)).not.toContain(body);
  });
});

describe("logAudit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常系: 1 行 1 JSON で出力する", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logAudit(req("https://example.com/api/items/x1", { method: "DELETE" }), 204);

    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0][0] as string;
    expect(line).not.toContain("\n");
    expect(JSON.parse(line)).toMatchObject({
      type: "audit",
      method: "DELETE",
      path: "/api/items/x1",
      status: 204,
    });
  });

  // 監査ログの出力失敗でリクエストを落とさない（fail-open）。
  it("異常系: 出力が失敗してもスローしない", () => {
    vi.spyOn(console, "log").mockImplementation(() => {
      throw new Error("stdout closed");
    });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => logAudit(req(), 200)).not.toThrow();
    expect(err).toHaveBeenCalled();
  });
});
