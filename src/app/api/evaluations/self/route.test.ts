// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluations", () => ({ getAllSelfEvaluations: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getAllSelfEvaluations } from "@/lib/evaluations";
import { GET } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makeGet(query = "") {
  return new Request(`http://localhost/api/evaluations/self${query}`, {
    method: "GET",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}

describe("GET /api/evaluations/self", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fiscalYear 指定で一覧を返す（userId 任意）", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getAllSelfEvaluations).mockResolvedValue([]);

    const res = await GET(makeGet("?fiscalYear=2025&userId=e1"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ selfEvaluations: [] });
    expect(getAllSelfEvaluations).toHaveBeenCalledWith(2025, { userId: "e1" });
  });

  it("userId 未指定でも呼べる", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getAllSelfEvaluations).mockResolvedValue([]);
    await GET(makeGet("?fiscalYear=2025"));
    expect(getAllSelfEvaluations).toHaveBeenCalledWith(2025, { userId: undefined });
  });

  it("fiscalYear 未指定は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await GET(makeGet())).status).toBe(400);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeGet("?fiscalYear=2025"))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeGet("?fiscalYear=2025"))).status).toBe(403);
  });
});
