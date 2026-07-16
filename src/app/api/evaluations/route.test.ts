// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluations", () => ({ getEvaluations: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getEvaluations } from "@/lib/evaluations";
import { GET } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makeGet(query = "") {
  return new Request(`http://localhost/api/evaluations${query}`, {
    method: "GET",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}

describe("GET /api/evaluations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("evaluateeId・fiscalYear 指定で詳細を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getEvaluations).mockResolvedValue([] as never);

    const res = await GET(makeGet("?fiscalYear=2025&evaluateeId=e1"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ evaluations: [] });
    expect(getEvaluations).toHaveBeenCalledWith("e1", 2025);
  });

  it("evaluateeId 未指定は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await GET(makeGet("?fiscalYear=2025"))).status).toBe(400);
    expect(getEvaluations).not.toHaveBeenCalled();
  });

  it("fiscalYear 不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await GET(makeGet("?evaluateeId=e1&fiscalYear=abc"))).status).toBe(400);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeGet("?fiscalYear=2025&evaluateeId=e1"))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeGet("?fiscalYear=2025&evaluateeId=e1"))).status).toBe(403);
  });
});
