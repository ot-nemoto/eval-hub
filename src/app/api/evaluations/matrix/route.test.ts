// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluations", () => ({ getEvaluationMatrix: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getEvaluationMatrix } from "@/lib/evaluations";
import { GET } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makeGet(query = "") {
  return new Request(`http://localhost/api/evaluations/matrix${query}`, {
    method: "GET",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}

describe("GET /api/evaluations/matrix", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fiscalYear 指定でマトリクスを返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getEvaluationMatrix).mockResolvedValue({ users: [], rows: [] });

    const res = await GET(makeGet("?fiscalYear=2025"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ users: [], rows: [] });
    expect(getEvaluationMatrix).toHaveBeenCalledWith(2025);
  });

  it("fiscalYear 未指定・不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await GET(makeGet())).status).toBe(400);
    expect((await GET(makeGet("?fiscalYear=abc"))).status).toBe(400);
    expect(getEvaluationMatrix).not.toHaveBeenCalled();
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeGet("?fiscalYear=2025"))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeGet("?fiscalYear=2025"))).status).toBe(403);
  });
});
