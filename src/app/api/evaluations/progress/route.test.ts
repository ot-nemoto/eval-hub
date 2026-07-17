// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluations", () => ({ getEvaluationProgress: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getEvaluationProgress } from "@/lib/evaluations";
import { GET } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makeGet(query = "") {
  return new Request(`http://localhost/api/evaluations/progress${query}`, {
    method: "GET",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}

describe("GET /api/evaluations/progress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fiscalYear 指定で進捗を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getEvaluationProgress).mockResolvedValue([]);

    const res = await GET(makeGet("?fiscalYear=2025"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ progress: [] });
    expect(getEvaluationProgress).toHaveBeenCalledWith(2025);
  });

  it("fiscalYear 未指定は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await GET(makeGet())).status).toBe(400);
    expect(getEvaluationProgress).not.toHaveBeenCalled();
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeGet("?fiscalYear=2025"))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeGet("?fiscalYear=2025"))).status).toBe(403);
  });
});
