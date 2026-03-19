// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    fiscalYear: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn() },
    evaluationAssignment: { count: vi.fn() },
    evaluation: { count: vi.fn() },
    evaluationSetting: { count: vi.fn() },
    fiscalYearItem: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "admin" } };
const memberSession = { user: { id: "member-1", role: "member" } };
const mockFy = {
  year: 2026,
  name: "2026年度",
  start_date: new Date("2026-04-01"),
  end_date: new Date("2027-03-31"),
  is_current: false,
};

function makeParams(year: string) {
  return { params: Promise.resolve({ year }) };
}

describe("PATCH /api/admin/fiscal-years/:year", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は年度情報を更新できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(prisma as never));
    vi.mocked(prisma.fiscalYear.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.fiscalYear.update).mockResolvedValue({
      ...mockFy,
      name: "2026年度（改）",
    } as never);

    const req = new Request("http://localhost/api/admin/fiscal-years/2026", {
      method: "PATCH",
      body: JSON.stringify({ name: "2026年度（改）" }),
    });
    const res = await PATCH(req, makeParams("2026"));
    expect(res.status).toBe(200);
  });

  it("is_current: true にすると他年度が false になる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(prisma as never));
    vi.mocked(prisma.fiscalYear.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.fiscalYear.update).mockResolvedValue({ ...mockFy, is_current: true } as never);

    const req = new Request("http://localhost/api/admin/fiscal-years/2026", {
      method: "PATCH",
      body: JSON.stringify({ is_current: true }),
    });
    const res = await PATCH(req, makeParams("2026"));
    expect(res.status).toBe(200);
    expect(prisma.fiscalYear.updateMany).toHaveBeenCalledWith({
      where: { is_current: true, year: { not: 2026 } },
      data: { is_current: false },
    });
  });

  it("存在しない年度は 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/fiscal-years/9999", {
      method: "PATCH",
      body: JSON.stringify({ name: "test" }),
    });
    const res = await PATCH(req, makeParams("9999"));
    expect(res.status).toBe(404);
  });

  it("未認証は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request("http://localhost/api/admin/fiscal-years/2026", {
      method: "PATCH",
      body: JSON.stringify({ name: "test" }),
    });
    const res = await PATCH(req, makeParams("2026"));
    expect(res.status).toBe(401);
  });

  it("member は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const req = new Request("http://localhost/api/admin/fiscal-years/2026", {
      method: "PATCH",
      body: JSON.stringify({ name: "test" }),
    });
    const res = await PATCH(req, makeParams("2026"));
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/fiscal-years/:year", () => {
  beforeEach(() => vi.clearAllMocks());

  it("紐づきがない年度は削除できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.evaluationAssignment.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluationSetting.count).mockResolvedValue(0);
    vi.mocked(prisma.fiscalYearItem.count).mockResolvedValue(0);
    vi.mocked(prisma.fiscalYear.delete).mockResolvedValue(mockFy as never);

    const req = new Request("http://localhost/api/admin/fiscal-years/2026", { method: "DELETE" });
    const res = await DELETE(req, makeParams("2026"));
    expect(res.status).toBe(204);
  });

  it("紐づくデータがある場合は 409", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.evaluationAssignment.count).mockResolvedValue(1);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluationSetting.count).mockResolvedValue(0);
    vi.mocked(prisma.fiscalYearItem.count).mockResolvedValue(0);

    const req = new Request("http://localhost/api/admin/fiscal-years/2026", { method: "DELETE" });
    const res = await DELETE(req, makeParams("2026"));
    expect(res.status).toBe(409);
  });

  it("存在しない年度は 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/fiscal-years/9999", { method: "DELETE" });
    const res = await DELETE(req, makeParams("9999"));
    expect(res.status).toBe(404);
  });

  it("未認証は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request("http://localhost/api/admin/fiscal-years/2026", { method: "DELETE" });
    const res = await DELETE(req, makeParams("2026"));
    expect(res.status).toBe(401);
  });
});
