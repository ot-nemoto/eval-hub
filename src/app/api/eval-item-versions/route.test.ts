// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/eval-item-versions", () => ({
  getEvalItemVersions: vi.fn(),
  createEvalItemVersion: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { BadRequestError } from "@/lib/errors";
import { createEvalItemVersion, getEvalItemVersions } from "@/lib/eval-item-versions";
import { GET, POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

const libVersion = {
  id: 1,
  name: "ver1",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  _count: { details: 10, fiscalYears: 2 },
};

function makeGet() {
  return new Request("http://localhost/api/eval-item-versions", {
    method: "GET",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}
function makePost(body: unknown) {
  return new Request("http://localhost/api/eval-item-versions", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

describe("GET /api/eval-item-versions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("一覧を返す（_count を件数に展開・createdAt は ISO）", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getEvalItemVersions).mockResolvedValue([libVersion] as never);

    const res = await GET(makeGet());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.evalItemVersions[0]).toEqual({
      id: 1,
      name: "ver1",
      createdAt: "2026-01-01T00:00:00.000Z",
      detailsCount: 10,
      fiscalYearsCount: 2,
    });
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeGet())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeGet())).status).toBe(403);
  });
});

describe("POST /api/eval-item-versions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("作成して 201 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createEvalItemVersion).mockResolvedValue({
      id: 1,
      name: "ver1",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    } as never);

    const res = await POST(makePost({ name: "ver1" }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.name).toBe("ver1");
    expect(createEvalItemVersion).toHaveBeenCalledWith("ver1");
  });

  it("name 空は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makePost({ name: "  " }))).status).toBe(400);
    expect(createEvalItemVersion).not.toHaveBeenCalled();
  });

  it("評価項目が存在しない（lib BadRequest）は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createEvalItemVersion).mockRejectedValue(
      new BadRequestError("評価項目が存在しません"),
    );
    expect((await POST(makePost({ name: "ver1" }))).status).toBe(400);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await POST(makePost({ name: "ver1" }))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await POST(makePost({ name: "ver1" }))).status).toBe(403);
  });
});
