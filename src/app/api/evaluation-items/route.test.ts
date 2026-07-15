// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluation-items", () => ({
  getEvaluationItems: vi.fn(),
  createEvaluationItem: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { createEvaluationItem, getEvaluationItems } from "@/lib/evaluation-items";
import { GET, POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

const libItem = {
  id: 1,
  targetId: 1,
  categoryId: 1,
  no: 1,
  name: "item A",
  description: null,
  evalCriteria: null,
  target: { id: 1, name: "社員", no: 1 },
  category: { id: 1, targetId: 1, name: "エンゲージメント", no: 1 },
};
const serialized = {
  id: 1,
  no: 1,
  name: "item A",
  description: null,
  evalCriteria: null,
  target: { id: 1, no: 1, name: "社員" },
  category: { id: 1, no: 1, name: "エンゲージメント" },
};

function makeGet(query = "") {
  return new Request(`http://localhost/api/evaluation-items${query}`, {
    method: "GET",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}
function makePost(body: unknown) {
  return new Request("http://localhost/api/evaluation-items", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

describe("GET /api/evaluation-items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ADMIN は一覧を返す（フィルタなし）", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getEvaluationItems).mockResolvedValue([libItem] as never);

    const res = await GET(makeGet());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ evaluationItems: [serialized] });
    expect(getEvaluationItems).toHaveBeenCalledWith({ targetId: undefined, categoryId: undefined });
  });

  it("targetId・categoryId で絞り込む", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getEvaluationItems).mockResolvedValue([] as never);

    await GET(makeGet("?targetId=1&categoryId=2"));
    expect(getEvaluationItems).toHaveBeenCalledWith({ targetId: 1, categoryId: 2 });
  });

  it("targetId 不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await GET(makeGet("?targetId=abc"))).status).toBe(400);
    expect(getEvaluationItems).not.toHaveBeenCalled();
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeGet())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeGet())).status).toBe(403);
  });
});

describe("POST /api/evaluation-items", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = { targetId: 1, categoryId: 1, name: "item A" };

  it("作成して 201 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createEvaluationItem).mockResolvedValue(libItem as never);

    const res = await POST(makePost(validBody));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body).toEqual(serialized);
    expect(createEvaluationItem).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: 1, categoryId: 1, name: "item A" }),
    );
  });

  it("name 欠落・空文字は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makePost({ targetId: 1, categoryId: 1 }))).status).toBe(400);
    expect((await POST(makePost({ targetId: 1, categoryId: 1, name: "  " }))).status).toBe(400);
    expect(createEvaluationItem).not.toHaveBeenCalled();
  });

  it("targetId 欠落は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makePost({ categoryId: 1, name: "x" }))).status).toBe(400);
  });

  it("所属が未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createEvaluationItem).mockRejectedValue(new NotFoundError("大分類が見つかりません"));
    expect((await POST(makePost(validBody))).status).toBe(404);
  });

  it("categoryId が targetId と不整合は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createEvaluationItem).mockRejectedValue(
      new BadRequestError("categoryId が targetId と一致しません"),
    );
    expect((await POST(makePost(validBody))).status).toBe(400);
  });

  it("同名重複は 409", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createEvaluationItem).mockRejectedValue(
      new ConflictError("同じ名称の評価項目が既に存在します"),
    );
    expect((await POST(makePost(validBody))).status).toBe(409);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await POST(makePost(validBody))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await POST(makePost(validBody))).status).toBe(403);
  });
});
