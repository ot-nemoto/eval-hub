// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/eval-item-versions", () => ({
  assignVersionToFiscalYear: vi.fn(),
  unassignVersionFromFiscalYear: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { assignVersionToFiscalYear, unassignVersionFromFiscalYear } from "@/lib/eval-item-versions";
import { DELETE, POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/fiscal-years/2025/version", {
    method,
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as import("next/server").NextRequest;
}

const ctx = (year = "2025") => ({ params: Promise.resolve({ year }) });

describe("POST /api/fiscal-years/[year]/version", () => {
  beforeEach(() => vi.clearAllMocks());

  it("割り当てて 200 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(assignVersionToFiscalYear).mockResolvedValue({ year: 2025, evalItemVersionId: 1 });

    const res = await POST(makeRequest("POST", { versionId: 1 }), ctx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ year: 2025, evalItemVersionId: 1 });
    expect(assignVersionToFiscalYear).toHaveBeenCalledWith(2025, 1);
  });

  it("versionId 欠落・不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makeRequest("POST", {}), ctx())).status).toBe(400);
    expect((await POST(makeRequest("POST", { versionId: 0 }), ctx())).status).toBe(400);
    expect(assignVersionToFiscalYear).not.toHaveBeenCalled();
  });

  it("年度/バージョン未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(assignVersionToFiscalYear).mockRejectedValue(
      new NotFoundError("年度が見つかりません"),
    );
    expect((await POST(makeRequest("POST", { versionId: 1 }), ctx())).status).toBe(404);
  });

  it("ロック中（ConflictError）は 409", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(assignVersionToFiscalYear).mockRejectedValue(
      new ConflictError("この年度はロックされているため編集できません"),
    );
    expect((await POST(makeRequest("POST", { versionId: 1 }), ctx())).status).toBe(409);
  });

  it("year 不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makeRequest("POST", { versionId: 1 }), ctx("abc"))).status).toBe(400);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await POST(makeRequest("POST", { versionId: 1 }), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await POST(makeRequest("POST", { versionId: 1 }), ctx())).status).toBe(403);
  });
});

describe("DELETE /api/fiscal-years/[year]/version", () => {
  beforeEach(() => vi.clearAllMocks());

  it("解除して 204 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(unassignVersionFromFiscalYear).mockResolvedValue({
      year: 2025,
      evalItemVersionId: null,
    });

    const res = await DELETE(makeRequest("DELETE"), ctx());
    expect(res.status).toBe(204);
    expect(unassignVersionFromFiscalYear).toHaveBeenCalledWith(2025);
  });

  it("未存在は 404 / ロック中は 409", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(unassignVersionFromFiscalYear).mockRejectedValue(
      new NotFoundError("年度が見つかりません"),
    );
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(404);
    vi.mocked(unassignVersionFromFiscalYear).mockRejectedValue(
      new ConflictError("この年度はロックされているため編集できません"),
    );
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(409);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(403);
  });
});
