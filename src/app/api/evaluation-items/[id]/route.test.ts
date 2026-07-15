// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluation-items", () => ({
  updateEvaluationItem: vi.fn(),
  deleteEvaluationItem: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { deleteEvaluationItem, updateEvaluationItem } from "@/lib/evaluation-items";
import { DELETE, PATCH } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

const libItem = {
  id: 1,
  targetId: 1,
  categoryId: 1,
  no: 2,
  name: "更新後",
  description: null,
  evalCriteria: null,
  target: { id: 1, name: "社員", no: 1 },
  category: { id: 1, targetId: 1, name: "エンゲージメント", no: 1 },
};

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/evaluation-items/1", {
    method,
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as import("next/server").NextRequest;
}

const ctx = (id = "1") => ({ params: Promise.resolve({ id }) });

describe("PATCH /api/evaluation-items/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("更新して 200 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(updateEvaluationItem).mockResolvedValue(libItem as never);

    const res = await PATCH(makeRequest("PATCH", { name: "更新後", no: 2 }), ctx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.name).toBe("更新後");
    expect(updateEvaluationItem).toHaveBeenCalledWith(1, { name: "更新後", no: 2 });
  });

  it("空 body は 400（lib が BadRequest）", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(updateEvaluationItem).mockRejectedValue(
      new BadRequestError("更新するフィールドを指定してください"),
    );
    expect((await PATCH(makeRequest("PATCH", {}), ctx())).status).toBe(400);
  });

  it("未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(updateEvaluationItem).mockRejectedValue(
      new NotFoundError("評価項目が見つかりません"),
    );
    expect((await PATCH(makeRequest("PATCH", { name: "x" }), ctx())).status).toBe(404);
  });

  it("no 重複は 409", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(updateEvaluationItem).mockRejectedValue(
      new ConflictError("同じ中分類内に同じ no の評価項目がすでに存在します"),
    );
    expect((await PATCH(makeRequest("PATCH", { no: 3 }), ctx())).status).toBe(409);
  });

  it("no が 0 以下は 400（Zod）", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await PATCH(makeRequest("PATCH", { no: 0 }), ctx())).status).toBe(400);
    expect(updateEvaluationItem).not.toHaveBeenCalled();
  });

  it("id 不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await PATCH(makeRequest("PATCH", { name: "x" }), ctx("abc"))).status).toBe(400);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await PATCH(makeRequest("PATCH", { name: "x" }), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await PATCH(makeRequest("PATCH", { name: "x" }), ctx())).status).toBe(403);
  });
});

describe("DELETE /api/evaluation-items/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("削除して 204 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteEvaluationItem).mockResolvedValue(undefined);

    const res = await DELETE(makeRequest("DELETE"), ctx());
    expect(res.status).toBe(204);
    expect(deleteEvaluationItem).toHaveBeenCalledWith(1);
  });

  it("未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteEvaluationItem).mockRejectedValue(
      new NotFoundError("評価項目が見つかりません"),
    );
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(404);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(403);
  });
});
