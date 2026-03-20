// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    target: { findUnique: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "admin" } };
const memberSession = { user: { id: "member-1", role: "member" } };

const mockCategories = [
  { id: 1, targetId: 1, name: "engagement", no: 1 },
  { id: 2, targetId: 1, name: "skill", no: 2 },
];

describe("GET /api/admin/categories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は中分類一覧を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.category.findMany).mockResolvedValue(mockCategories as never);

    const req = new Request("http://localhost/api/admin/categories");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("?targetId でフィルタできる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.category.findMany).mockResolvedValue([mockCategories[0]] as never);

    const req = new Request("http://localhost/api/admin/categories?targetId=1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { targetId: 1 } }),
    );
  });

  it("?targetId が不正値の場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    const res = await GET(new Request("http://localhost/api/admin/categories?targetId=abc"));
    expect(res.status).toBe(400);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/admin/categories"));
    expect(res.status).toBe(401);
  });

  it("member の場合は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const res = await GET(new Request("http://localhost/api/admin/categories"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/categories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は中分類を追加できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue({ id: 1 } as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.category.create).mockResolvedValue(mockCategories[0] as never);

    const req = new Request("http://localhost/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({ targetId: 1, name: "engagement", no: 1 }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.name).toBe("engagement");
  });

  it("name が空文字の場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    const req = new Request("http://localhost/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({ targetId: 1, name: "", no: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("targetId がない場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({ name: "x", no: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("存在しない targetId の場合は 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({ targetId: 999, name: "x", no: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("同じ targetId と no が存在する場合は 409", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue({ id: 1 } as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategories[0] as never);

    const req = new Request("http://localhost/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({ targetId: 1, name: "dup", no: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request("http://localhost/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({ targetId: 1, name: "x", no: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("member の場合は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const req = new Request("http://localhost/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({ targetId: 1, name: "x", no: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
