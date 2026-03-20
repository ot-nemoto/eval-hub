// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    fiscalYear: { findUnique: vi.fn() },
    evaluationItem: { findUnique: vi.fn() },
    fiscalYearItem: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "admin" } };
const mockFy = { year: 2026 };
const mockItem = {
  id: 1,
  target_id: 1,
  category_id: 1,
  no: 1,
  name: "基本姿勢",
};

function makeParams(year: string) {
  return { params: Promise.resolve({ year }) };
}

describe("GET /api/admin/fiscal-years/:year/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("年度に紐づく評価項目一覧を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.fiscalYearItem.findMany).mockResolvedValue([
      { evaluation_item: mockItem },
    ] as never);

    const req = new Request("http://localhost/api/admin/fiscal-years/2026/items");
    const res = await GET(req, makeParams("2026"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(1);
    expect(body.data[0].name).toBe("基本姿勢");
  });

  it("存在しない年度は 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/fiscal-years/9999/items");
    const res = await GET(req, makeParams("9999"));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/admin/fiscal-years/:year/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("評価項目を年度に追加できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.fiscalYearItem.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.fiscalYearItem.create).mockResolvedValue({
      fiscal_year: 2026,
      evaluation_item_id: 1,
    } as never);

    const req = new Request("http://localhost/api/admin/fiscal-years/2026/items", {
      method: "POST",
      body: JSON.stringify({ evaluation_item_id: 1 }),
    });
    const res = await POST(req, makeParams("2026"));
    expect(res.status).toBe(201);
  });

  it("すでに紐づいている場合は 409", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.fiscalYearItem.findUnique).mockResolvedValue({
      fiscal_year: 2026,
      evaluation_item_id: 1,
    } as never);

    const req = new Request("http://localhost/api/admin/fiscal-years/2026/items", {
      method: "POST",
      body: JSON.stringify({ evaluation_item_id: 1 }),
    });
    const res = await POST(req, makeParams("2026"));
    expect(res.status).toBe(409);
  });

  it("evaluation_item_id が未指定の場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/fiscal-years/2026/items", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, makeParams("2026"));
    expect(res.status).toBe(400);
  });
});
