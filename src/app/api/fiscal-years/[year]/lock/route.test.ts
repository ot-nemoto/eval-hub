// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/fiscal-years", () => ({ toggleFiscalYearLock: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { NotFoundError } from "@/lib/errors";
import { toggleFiscalYearLock } from "@/lib/fiscal-years";
import { POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

const lockedFy = {
  year: 2025,
  name: "2025年度",
  startDate: new Date("2025-04-01"),
  endDate: new Date("2026-03-31"),
  isCurrent: false,
  isLocked: true,
  evalItemVersionId: null,
};

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/fiscal-years/2025/lock", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as import("next/server").NextRequest;
}

const ctx = (year = "2025") => ({ params: Promise.resolve({ year }) });

describe("POST /api/fiscal-years/[year]/lock", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ロックして 200 と更新後の年度を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(toggleFiscalYearLock).mockResolvedValue(lockedFy as never);

    const res = await POST(makeRequest({ isLocked: true }), ctx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.isLocked).toBe(true);
    expect(toggleFiscalYearLock).toHaveBeenCalledWith(2025, true);
  });

  it("isLocked 欠落・非真偽値は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makeRequest({}), ctx())).status).toBe(400);
    expect((await POST(makeRequest({ isLocked: "yes" }), ctx())).status).toBe(400);
    expect(toggleFiscalYearLock).not.toHaveBeenCalled();
  });

  it("未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(toggleFiscalYearLock).mockRejectedValue(new NotFoundError("年度が見つかりません"));
    expect((await POST(makeRequest({ isLocked: true }), ctx())).status).toBe(404);
  });

  it("year 不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makeRequest({ isLocked: true }), ctx("abc"))).status).toBe(400);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await POST(makeRequest({ isLocked: true }), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await POST(makeRequest({ isLocked: true }), ctx())).status).toBe(403);
  });
});
