// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/categories", () => ({ reorderCategories: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { reorderCategories } from "@/lib/categories";
import { NotFoundError } from "@/lib/errors";
import { POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/categories/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as import("next/server").NextRequest;
}

const validBody = {
  orders: [
    { id: 1, index: 2 },
    { id: 2, index: 1 },
  ],
};

describe("POST /api/categories/reorder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("並び替えて 200 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(reorderCategories).mockResolvedValue(undefined);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(reorderCategories).toHaveBeenCalledWith(validBody.orders);
  });

  it("orders 欠落は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makeRequest({}))).status).toBe(400);
    expect(reorderCategories).not.toHaveBeenCalled();
  });

  it("対象未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(reorderCategories).mockRejectedValue(
      new NotFoundError("並び替え対象の中分類が見つかりません"),
    );
    expect((await POST(makeRequest(validBody))).status).toBe(404);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await POST(makeRequest(validBody))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await POST(makeRequest(validBody))).status).toBe(403);
  });
});
