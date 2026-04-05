// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluationItem: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    fiscalYearItem: { count: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };
const memberSession = { user: { id: "member-1", role: "MEMBER" } };

const mockItem = {
  id: 1,
  targetId: 1,
  categoryId: 1,
  no: 1,
  name: "会社員としての基本姿勢",
  description: null,
  evalCriteria: null,
  target: { id: 1, name: "employee", no: 1 },
  category: { id: 1, targetId: 1, name: "engagement", no: 1 },
};

const params = Promise.resolve({ id: "1" });

describe("PATCH /api/admin/evaluation-items/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は評価項目を編集できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.evaluationItem.update).mockResolvedValue({ ...mockItem, name: "更新後の名称" } as never);

    const req = new Request("http://localhost/api/admin/evaluation-items/1", {
      method: "PATCH",
      body: JSON.stringify({ name: "更新後の名称" }),
    });
    const res = await PATCH(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("更新後の名称");
  });

  it("存在しない ID の場合は 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/evaluation-items/999", {
      method: "PATCH",
      body: JSON.stringify({ name: "test" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("更新フィールドが空の場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);

    const req = new Request("http://localhost/api/admin/evaluation-items/1", {
      method: "PATCH",
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(400);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request("http://localhost/api/admin/evaluation-items/1", {
      method: "PATCH",
      body: JSON.stringify({ name: "test" }),
    });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(401);
  });

  it("member の場合は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const req = new Request("http://localhost/api/admin/evaluation-items/1", {
      method: "PATCH",
      body: JSON.stringify({ name: "test" }),
    });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/evaluation-items/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は年度に紐づいていない評価項目を削除できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.fiscalYearItem.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluationItem.delete).mockResolvedValue(mockItem as never);

    const req = new Request("http://localhost/api/admin/evaluation-items/1", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(204);
  });

  it("年度に紐づいている場合は 409", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.fiscalYearItem.count).mockResolvedValue(3);

    const req = new Request("http://localhost/api/admin/evaluation-items/1", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(409);
  });

  it("存在しない ID の場合は 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/evaluation-items/999", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request("http://localhost/api/admin/evaluation-items/1", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(401);
  });

  it("member の場合は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const req = new Request("http://localhost/api/admin/evaluation-items/1", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(403);
  });
});
