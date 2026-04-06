// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    evaluationItem: { count: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };
const memberSession = { user: { id: "member-1", role: "MEMBER" } };

const mockCategory = { id: 1, targetId: 1, name: "engagement", no: 1 };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/categories/1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/categories/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は name を更新できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as never);
    vi.mocked(prisma.category.update).mockResolvedValue({
      ...mockCategory,
      name: "updated",
    } as never);

    const res = await PATCH(makeRequest({ name: "updated" }), {
      params: Promise.resolve({ id: "1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("updated");
  });

  it("admin は no を更新できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.category.findUnique)
      .mockResolvedValueOnce(mockCategory as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.category.update).mockResolvedValue({ ...mockCategory, no: 10 } as never);

    const res = await PATCH(makeRequest({ no: 10 }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
  });

  it("存在しない id の場合は 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    const res = await PATCH(makeRequest({ name: "x" }), { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("更新フィールドがない場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as never);

    const res = await PATCH(makeRequest({}), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("no が重複する場合は 409", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.category.findUnique)
      .mockResolvedValueOnce(mockCategory as never)
      .mockResolvedValueOnce({ id: 2, targetId: 1, name: "other", no: 2 } as never);

    const res = await PATCH(makeRequest({ no: 2 }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(409);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await PATCH(makeRequest({ name: "x" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("member の場合は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const res = await PATCH(makeRequest({ name: "x" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/categories/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は中分類を削除できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as never);
    vi.mocked(prisma.evaluationItem.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.category.delete).mockResolvedValue(mockCategory as never);

    const req = new Request("http://localhost/api/admin/categories/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(204);
  });

  it("evaluation_items が紐づく場合は 409", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as never);
    vi.mocked(prisma.evaluationItem.count).mockResolvedValue(3 as never);

    const req = new Request("http://localhost/api/admin/categories/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(409);
  });

  it("存在しない id の場合は 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/categories/999", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request("http://localhost/api/admin/categories/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("member の場合は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const req = new Request("http://localhost/api/admin/categories/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });
});
