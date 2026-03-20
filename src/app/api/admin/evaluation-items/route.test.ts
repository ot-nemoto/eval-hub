// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluationItem: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    target: { findUnique: vi.fn() },
    category: { findUnique: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "admin" } };
const memberSession = { user: { id: "member-1", role: "member" } };

const mockTarget = { id: 1, name: "employee", no: 1 };
const mockCategory = { id: 1, target_id: 1, name: "engagement", no: 1 };
const mockItem = {
  uid: "1-1-1",
  target_id: 1,
  category_id: 1,
  no: 1,
  name: "会社員としての基本姿勢",
  description: null,
  eval_criteria: null,
  target: mockTarget,
  category: mockCategory,
};

describe("GET /api/admin/evaluation-items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は評価項目一覧を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue([mockItem] as never);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].target.name).toBe("employee");
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

describe("POST /api/admin/evaluation-items", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = { target_id: 1, category_id: 1, name: "新しい評価項目" };

  it("admin は評価項目を追加でき、uid が自動生成される", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as never);
    vi.mocked(prisma.evaluationItem.findFirst).mockResolvedValue({ no: 3 } as never);
    vi.mocked(prisma.evaluationItem.create).mockResolvedValue({ ...mockItem, uid: "1-1-4", no: 4 } as never);

    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(prisma.evaluationItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ uid: "1-1-4", no: 4 }),
      }),
    );
  });

  it("カテゴリ内に項目がない場合、no=1 で uid が生成される", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as never);
    vi.mocked(prisma.evaluationItem.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.evaluationItem.create).mockResolvedValue({ ...mockItem, uid: "1-1-1", no: 1 } as never);

    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    await POST(req);

    expect(prisma.evaluationItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ uid: "1-1-1", no: 1 }),
      }),
    );
  });

  it("target_id が存在しない場合は 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify({ ...validBody, target_id: 999 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("category_id が存在しない場合は 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify({ ...validBody, category_id: 999 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("category が target に属さない場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue({ ...mockCategory, target_id: 2 } as never);

    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("target_id がない場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify({ category_id: 1, name: "test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("name がない場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify({ target_id: 1, category_id: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("member の場合は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
