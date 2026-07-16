// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/eval-item-versions", () => ({
  getEvalItemVersionDetails: vi.fn(),
  deleteEvalItemVersion: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { deleteEvalItemVersion, getEvalItemVersionDetails } from "@/lib/eval-item-versions";
import { DELETE, GET } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makeRequest(method: string) {
  return new Request("http://localhost/api/eval-item-versions/1", {
    method,
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}

const ctx = (id = "1") => ({ params: Promise.resolve({ id }) });

describe("GET /api/eval-item-versions/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("詳細を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getEvalItemVersionDetails).mockResolvedValue({
      version: { id: 1, name: "ver1", createdAt: new Date("2026-01-01T00:00:00Z") },
      details: [],
    } as never);

    const res = await GET(makeRequest("GET"), ctx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.version.id).toBe(1);
    expect(getEvalItemVersionDetails).toHaveBeenCalledWith(1);
  });

  it("未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getEvalItemVersionDetails).mockRejectedValue(
      new NotFoundError("バージョンが見つかりません"),
    );
    expect((await GET(makeRequest("GET"), ctx())).status).toBe(404);
  });

  it("id 不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await GET(makeRequest("GET"), ctx("abc"))).status).toBe(400);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeRequest("GET"), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeRequest("GET"), ctx())).status).toBe(403);
  });
});

describe("DELETE /api/eval-item-versions/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("削除して 204 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteEvalItemVersion).mockResolvedValue(undefined);

    const res = await DELETE(makeRequest("DELETE"), ctx());
    expect(res.status).toBe(204);
    expect(deleteEvalItemVersion).toHaveBeenCalledWith(1);
  });

  it("年度割当中（ConflictError）は 409", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteEvalItemVersion).mockRejectedValue(
      new ConflictError("年度に割り当て中のバージョンは削除できません"),
    );
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(409);
  });

  it("未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteEvalItemVersion).mockRejectedValue(
      new NotFoundError("バージョンが見つかりません"),
    );
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(404);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(403);
  });
});
