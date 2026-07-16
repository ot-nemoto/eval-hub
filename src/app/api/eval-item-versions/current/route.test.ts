// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/eval-item-versions", () => ({ getCurrentEvalItems: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getCurrentEvalItems } from "@/lib/eval-item-versions";
import { GET } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makeGet() {
  return new Request("http://localhost/api/eval-item-versions/current", {
    method: "GET",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}

describe("GET /api/eval-item-versions/current", () => {
  beforeEach(() => vi.clearAllMocks());

  it("現在のマスタ項目を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getCurrentEvalItems).mockResolvedValue([] as never);

    const res = await GET(makeGet());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ currentEvalItems: [] });
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeGet())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeGet())).status).toBe(403);
  });
});
