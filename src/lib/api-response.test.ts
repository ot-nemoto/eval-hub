// @vitest-environment node
import { describe, expect, it } from "vitest";
import { errorResponse, successResponse } from "./api-response";

describe("successResponse", () => {
  it("data を含む 200 レスポンスを返す", async () => {
    const res = successResponse({ id: "1", name: "test" });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ data: { id: "1", name: "test" } });
  });

  it("meta を含む場合は meta も返す", async () => {
    const res = successResponse([1, 2, 3], { total: 3, page: 1 });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ data: [1, 2, 3], meta: { total: 3, page: 1 } });
  });

  it("status を指定できる", async () => {
    const res = successResponse({ created: true }, undefined, 201);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ data: { created: true } });
  });

  it("meta なしの場合は meta キーを含まない", async () => {
    const res = successResponse({ id: "1" });
    const body = await res.json();
    expect(body).not.toHaveProperty("meta");
  });
});

describe("errorResponse", () => {
  it("UNAUTHORIZED エラーを 401 で返す", async () => {
    const res = errorResponse("UNAUTHORIZED", "認証が必要です", 401);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body).toEqual({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } });
  });

  it("FORBIDDEN エラーを 403 で返す", async () => {
    const res = errorResponse("FORBIDDEN", "権限がありません", 403);
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body).toEqual({ error: { code: "FORBIDDEN", message: "権限がありません" } });
  });

  it("NOT_FOUND エラーを 404 で返す", async () => {
    const res = errorResponse("NOT_FOUND", "リソースが見つかりません", 404);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body).toEqual({ error: { code: "NOT_FOUND", message: "リソースが見つかりません" } });
  });

  it("BAD_REQUEST エラーを 400 で返す", async () => {
    const res = errorResponse("BAD_REQUEST", "入力値が不正です", 400);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ error: { code: "BAD_REQUEST", message: "入力値が不正です" } });
  });

  it("CONFLICT エラーを 409 で返す", async () => {
    const res = errorResponse("CONFLICT", "すでに存在します", 409);
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body).toEqual({ error: { code: "CONFLICT", message: "すでに存在します" } });
  });

  it("INTERNAL_SERVER_ERROR を 500 で返す", async () => {
    const res = errorResponse("INTERNAL_SERVER_ERROR", "サーバーエラー", 500);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body).toEqual({ error: { code: "INTERNAL_SERVER_ERROR", message: "サーバーエラー" } });
  });
});
