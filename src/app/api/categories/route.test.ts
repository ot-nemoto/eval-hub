// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/categories", () => ({ getCategories: vi.fn(), createCategory: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { createCategory, getCategories } from "@/lib/categories";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { GET, POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };
const category = { id: 1, targetId: 1, name: "エンゲージメント", no: 1, index: 1 };

function makeGet(query = "") {
  return new Request(`http://localhost/api/categories${query}`, {
    method: "GET",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}
function makePost(body: unknown) {
  return new Request("http://localhost/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

describe("GET /api/categories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ADMIN は一覧を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getCategories).mockResolvedValue([category]);

    const res = await GET(makeGet());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ categories: [category] });
    expect(getCategories).toHaveBeenCalledWith(undefined);
  });

  it("targetId で絞り込む", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getCategories).mockResolvedValue([category]);

    await GET(makeGet("?targetId=1"));
    expect(getCategories).toHaveBeenCalledWith(1);
  });

  it("targetId 不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await GET(makeGet("?targetId=abc"))).status).toBe(400);
    expect(getCategories).not.toHaveBeenCalled();
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeGet())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeGet())).status).toBe(403);
  });
});

describe("POST /api/categories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("作成して 201 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createCategory).mockResolvedValue(category);

    const res = await POST(makePost({ targetId: 1, name: "エンゲージメント" }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body).toEqual(category);
    expect(createCategory).toHaveBeenCalledWith({ targetId: 1, name: "エンゲージメント" });
  });

  it("targetId 欠落は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makePost({ name: "x" }))).status).toBe(400);
    expect(createCategory).not.toHaveBeenCalled();
  });

  it("name 空文字は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makePost({ targetId: 1, name: "  " }))).status).toBe(400);
    expect(createCategory).not.toHaveBeenCalled();
  });

  it("大分類が未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createCategory).mockRejectedValue(new NotFoundError("大分類が見つかりません"));
    expect((await POST(makePost({ targetId: 99, name: "x" }))).status).toBe(404);
  });

  it("no 重複は 409", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createCategory).mockRejectedValue(
      new ConflictError("同じ targetId と no の中分類がすでに存在します"),
    );
    expect((await POST(makePost({ targetId: 1, name: "x" }))).status).toBe(409);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await POST(makePost({ targetId: 1, name: "x" }))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await POST(makePost({ targetId: 1, name: "x" }))).status).toBe(403);
  });
});
