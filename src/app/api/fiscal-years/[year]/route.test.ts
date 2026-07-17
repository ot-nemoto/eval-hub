// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/fiscal-years", () => ({ updateFiscalYear: vi.fn(), deleteFiscalYear: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { deleteFiscalYear, updateFiscalYear } from "@/lib/fiscal-years";
import { DELETE, PATCH } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

const libFy = {
  year: 2025,
  name: "2025年度(更新)",
  startDate: new Date("2025-04-01"),
  endDate: new Date("2026-03-31"),
  isCurrent: true,
  isLocked: false,
  evalItemVersionId: null,
};

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/fiscal-years/2025", {
    method,
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as import("next/server").NextRequest;
}

const ctx = (year = "2025") => ({ params: Promise.resolve({ year }) });

describe("PATCH /api/fiscal-years/[year]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("更新して 200 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(updateFiscalYear).mockResolvedValue(libFy as never);

    const res = await PATCH(
      makeRequest("PATCH", { name: "2025年度(更新)", isCurrent: true }),
      ctx(),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.name).toBe("2025年度(更新)");
    expect(updateFiscalYear).toHaveBeenCalledWith(2025, {
      name: "2025年度(更新)",
      isCurrent: true,
    });
  });

  it("空 body は 400（lib が BadRequest）", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(updateFiscalYear).mockRejectedValue(
      new BadRequestError("更新するフィールドを指定してください"),
    );
    expect((await PATCH(makeRequest("PATCH", {}), ctx())).status).toBe(400);
  });

  it("未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(updateFiscalYear).mockRejectedValue(new NotFoundError("年度が見つかりません"));
    expect((await PATCH(makeRequest("PATCH", { name: "x" }), ctx())).status).toBe(404);
  });

  it("isCurrent 非真偽値は 400（Zod）", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await PATCH(makeRequest("PATCH", { isCurrent: "yes" }), ctx())).status).toBe(400);
    expect(updateFiscalYear).not.toHaveBeenCalled();
  });

  it("year 不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await PATCH(makeRequest("PATCH", { name: "x" }), ctx("abc"))).status).toBe(400);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await PATCH(makeRequest("PATCH", { name: "x" }), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await PATCH(makeRequest("PATCH", { name: "x" }), ctx())).status).toBe(403);
  });
});

describe("DELETE /api/fiscal-years/[year]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("削除して 204 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteFiscalYear).mockResolvedValue(undefined);

    const res = await DELETE(makeRequest("DELETE"), ctx());
    expect(res.status).toBe(204);
    expect(deleteFiscalYear).toHaveBeenCalledWith(2025);
  });

  it("紐づくデータあり（ConflictError）は 409", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteFiscalYear).mockRejectedValue(
      new ConflictError("紐づくデータが存在するため削除できません"),
    );
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(409);
  });

  it("未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteFiscalYear).mockRejectedValue(new NotFoundError("年度が見つかりません"));
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(404);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await DELETE(makeRequest("DELETE"), ctx())).status).toBe(403);
  });
});
