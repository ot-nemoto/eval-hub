// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    fiscalYear: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    fiscalYearItem: { findMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "admin" } };
const memberSession = { user: { id: "member-1", role: "member" } };

const mockFiscalYears = [
  {
    year: 2026,
    name: "2026年度",
    start_date: new Date("2026-04-01"),
    end_date: new Date("2027-03-31"),
    is_current: true,
  },
  {
    year: 2025,
    name: "2025年度",
    start_date: new Date("2025-04-01"),
    end_date: new Date("2026-03-31"),
    is_current: false,
  },
];

describe("GET /api/admin/fiscal-years", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は年度一覧を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findMany).mockResolvedValue(mockFiscalYears as never);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("member の場合は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const res = await GET();
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/fiscal-years", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は新しい年度を追加できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.fiscalYear.findFirst).mockResolvedValue(null);
    const newFy = {
      year: 2028,
      name: "2028年度",
      start_date: new Date("2028-04-01"),
      end_date: new Date("2029-03-31"),
      is_current: false,
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(prisma as never));
    vi.mocked(prisma.fiscalYear.create).mockResolvedValue(newFy as never);
    vi.mocked(prisma.fiscalYearItem.findMany).mockResolvedValue([]);

    const req = new Request("http://localhost/api/admin/fiscal-years", {
      method: "POST",
      body: JSON.stringify({
        year: 2028,
        name: "2028年度",
        start_date: "2028-04-01",
        end_date: "2029-03-31",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.year).toBe(2028);
  });

  it("同じ年度が既に存在する場合は 409", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFiscalYears[0] as never);

    const req = new Request("http://localhost/api/admin/fiscal-years", {
      method: "POST",
      body: JSON.stringify({
        year: 2026,
        name: "2026年度",
        start_date: "2026-04-01",
        end_date: "2027-03-31",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("必須フィールドが不足している場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/fiscal-years", {
      method: "POST",
      body: JSON.stringify({ year: 2028 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("year が小数の場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/fiscal-years", {
      method: "POST",
      body: JSON.stringify({ year: 2028.5, name: "2028年度", start_date: "2028-04-01", end_date: "2029-03-31" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("year が範囲外の場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/fiscal-years", {
      method: "POST",
      body: JSON.stringify({ year: 1800, name: "1800年度", start_date: "1800-04-01", end_date: "1801-03-31" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("直近年度の items をコピーする", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.fiscalYear.findFirst).mockResolvedValue({ year: 2026 } as never);
    const newFy = {
      year: 2027,
      name: "2027年度",
      start_date: new Date("2027-04-01"),
      end_date: new Date("2028-03-31"),
      is_current: false,
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(prisma as never));
    vi.mocked(prisma.fiscalYear.create).mockResolvedValue(newFy as never);
    vi.mocked(prisma.fiscalYearItem.findMany).mockResolvedValue([
      { evaluation_item_uid: "1-1-1" },
      { evaluation_item_uid: "1-1-2" },
    ] as never);
    vi.mocked(prisma.fiscalYearItem.createMany).mockResolvedValue({ count: 2 } as never);

    const req = new Request("http://localhost/api/admin/fiscal-years", {
      method: "POST",
      body: JSON.stringify({
        year: 2027,
        name: "2027年度",
        start_date: "2027-04-01",
        end_date: "2028-03-31",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(prisma.fiscalYearItem.createMany).toHaveBeenCalledWith({
      data: [
        { fiscal_year: 2027, evaluation_item_uid: "1-1-1" },
        { fiscal_year: 2027, evaluation_item_uid: "1-1-2" },
      ],
    });
  });
});
