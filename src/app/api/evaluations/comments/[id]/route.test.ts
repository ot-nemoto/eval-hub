// @vitest-environment node
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluations", () => ({
  updateManagerComment: vi.fn(),
  deleteManagerComment: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { deleteManagerComment, updateManagerComment } from "@/lib/evaluations";
import { DELETE, PATCH } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

const updated = {
  id: "c1",
  evaluationId: "eval-1",
  evaluatorId: "r1",
  score: null,
  reason: "修正後",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
};

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/evaluations/comments/c1", {
    method,
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as import("next/server").NextRequest;
}

const ctx = (id = "c1") => ({ params: Promise.resolve({ id }) });
const notFound = new Prisma.PrismaClientKnownRequestError("not found", {
  code: "P2025",
  clientVersion: "5",
});

describe("PATCH /api/evaluations/comments/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("更新して 200 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(updateManagerComment).mockResolvedValue(updated as never);

    const res = await PATCH(makeRequest("PATCH", { reason: "修正後" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.reason).toBe("修正後");
    expect(updateManagerComment).toHaveBeenCalledWith("c1", { reason: "修正後" });
  });

  it("reason 欠落は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await PATCH(makeRequest("PATCH", {}), ctx())).status).toBe(400);
    expect(updateManagerComment).not.toHaveBeenCalled();
  });

  it("未存在（P2025）は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(updateManagerComment).mockRejectedValue(notFound);
    expect((await PATCH(makeRequest("PATCH", { reason: "x" }), ctx())).status).toBe(404);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await PATCH(makeRequest("PATCH", { reason: "x" }), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await PATCH(makeRequest("PATCH", { reason: "x" }), ctx())).status).toBe(403);
  });
});

describe("DELETE /api/evaluations/comments/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("削除して 204 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteManagerComment).mockResolvedValue(undefined);

    const res = await DELETE(makeRequest("DELETE"), ctx());
    expect(res.status).toBe(204);
    expect(deleteManagerComment).toHaveBeenCalledWith("c1");
  });

  it("未存在（P2025）は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteManagerComment).mockRejectedValue(notFound);
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(404);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(403);
  });
});
