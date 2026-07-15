// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluation-items", () => ({ bulkReplaceEvaluationItems: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { ConflictError } from "@/lib/errors";
import { bulkReplaceEvaluationItems } from "@/lib/evaluation-items";
import { POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/evaluation-items/import", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as import("next/server").NextRequest;
}

const validBody = [
  {
    no: 1,
    name: "社員",
    categories: [{ no: 1, name: "エンゲージメント", items: [{ no: 1, name: "item A" }] }],
  },
];

describe("POST /api/evaluation-items/import", () => {
  beforeEach(() => vi.clearAllMocks());

  it("一括インポートして作成件数を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(bulkReplaceEvaluationItems).mockResolvedValue({ created: 1 });

    const res = await POST(makeRequest(validBody));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ created: 1 });
    expect(bulkReplaceEvaluationItems).toHaveBeenCalledWith(validBody);
  });

  it("配列でない body は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makeRequest({ not: "array" }))).status).toBe(400);
    expect(bulkReplaceEvaluationItems).not.toHaveBeenCalled();
  });

  it("空配列は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makeRequest([]))).status).toBe(400);
  });

  it("no 重複は 409", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(bulkReplaceEvaluationItems).mockRejectedValue(
      new ConflictError("no が重複しています"),
    );
    expect((await POST(makeRequest(validBody))).status).toBe(409);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await POST(makeRequest(validBody))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await POST(makeRequest(validBody))).status).toBe(403);
  });
});
