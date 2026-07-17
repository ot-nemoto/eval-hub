// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/targets", () => ({ updateTarget: vi.fn(), deleteTarget: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { deleteTarget, updateTarget } from "@/lib/targets";
import { DELETE, PATCH } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };
const target = { id: 1, name: "社員", no: 2, index: 1 };

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/targets/1", {
    method,
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as import("next/server").NextRequest;
}

const ctx = (id = "1") => ({ params: Promise.resolve({ id }) });

describe("PATCH /api/targets/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("更新して 200 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(updateTarget).mockResolvedValue(target);

    const res = await PATCH(makeRequest("PATCH", { name: "社員", no: 2 }), ctx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual(target);
    expect(updateTarget).toHaveBeenCalledWith(1, { name: "社員", no: 2 });
  });

  it("未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(updateTarget).mockRejectedValue(new NotFoundError("大分類が見つかりません"));
    expect((await PATCH(makeRequest("PATCH", { name: "x" }), ctx())).status).toBe(404);
  });

  it("no 重複は 409", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(updateTarget).mockRejectedValue(
      new ConflictError("同じ no の大分類がすでに存在します"),
    );
    expect((await PATCH(makeRequest("PATCH", { no: 3 }), ctx())).status).toBe(409);
  });

  it("id 不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await PATCH(makeRequest("PATCH", { name: "x" }), ctx("abc"))).status).toBe(400);
    expect(updateTarget).not.toHaveBeenCalled();
  });

  it("no が 0 以下は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await PATCH(makeRequest("PATCH", { no: -1 }), ctx())).status).toBe(400);
    expect(updateTarget).not.toHaveBeenCalled();
  });

  it("空 body（name・no とも欠落）は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await PATCH(makeRequest("PATCH", {}), ctx())).status).toBe(400);
    expect(updateTarget).not.toHaveBeenCalled();
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await PATCH(makeRequest("PATCH", { name: "x" }), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await PATCH(makeRequest("PATCH", { name: "x" }), ctx())).status).toBe(403);
  });
});

describe("DELETE /api/targets/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("削除して 204 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteTarget).mockResolvedValue(undefined);

    const res = await DELETE(makeRequest("DELETE"), ctx());
    expect(res.status).toBe(204);
    expect(deleteTarget).toHaveBeenCalledWith(1);
  });

  it("紐づく中分類あり（ConflictError）は 409", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteTarget).mockRejectedValue(
      new ConflictError("紐づく中分類が存在するため削除できません"),
    );
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(409);
  });

  it("未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteTarget).mockRejectedValue(new NotFoundError("大分類が見つかりません"));
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(404);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(403);
  });
});
