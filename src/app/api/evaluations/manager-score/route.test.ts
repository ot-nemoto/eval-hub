// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluations", () => ({ upsertManagerScore: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { upsertManagerScore } from "@/lib/evaluations";
import { POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makePost(body: unknown) {
  return new Request("http://localhost/api/evaluations/manager-score", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

const validBody = {
  fiscalYear: 2025,
  evaluateeId: "e1",
  evalItemVersionDetailId: 1,
  managerScore: "yu",
};

describe("POST /api/evaluations/manager-score", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upsert して 200 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(upsertManagerScore).mockResolvedValue({
      evalItemVersionDetailId: 1,
      managerScore: "yu",
    });

    const res = await POST(makePost(validBody));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.managerScore).toBe("yu");
    expect(upsertManagerScore).toHaveBeenCalledWith("e1", 2025, 1, "yu");
  });

  it("managerScore に null を渡せる", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(upsertManagerScore).mockResolvedValue({
      evalItemVersionDetailId: 1,
      managerScore: null,
    });
    const res = await POST(makePost({ ...validBody, managerScore: null }));
    expect(res.status).toBe(200);
    expect(upsertManagerScore).toHaveBeenCalledWith("e1", 2025, 1, null);
  });

  it("managerScore 欠落・不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect(
      (await POST(makePost({ fiscalYear: 2025, evaluateeId: "e1", evalItemVersionDetailId: 1 })))
        .status,
    ).toBe(400);
    expect((await POST(makePost({ ...validBody, managerScore: "bad" }))).status).toBe(400);
    expect(upsertManagerScore).not.toHaveBeenCalled();
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await POST(makePost(validBody))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await POST(makePost(validBody))).status).toBe(403);
  });
});
