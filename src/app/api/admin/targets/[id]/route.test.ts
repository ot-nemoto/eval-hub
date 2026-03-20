// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    target: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    category: { count: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "admin" } };
const memberSession = { user: { id: "member-1", role: "member" } };

const mockTarget = { id: 1, name: "employee", no: 1 };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/targets/1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/targets/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は name を更新できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.target.update).mockResolvedValue({ ...mockTarget, name: "updated" } as never);

    const res = await PATCH(makeRequest({ name: "updated" }), { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("updated");
  });

  it("admin は no を更新できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique)
      .mockResolvedValueOnce(mockTarget as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.target.update).mockResolvedValue({ ...mockTarget, no: 10 } as never);

    const res = await PATCH(makeRequest({ no: 10 }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
  });

  it("存在しない id の場合は 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(null);

    const res = await PATCH(makeRequest({ name: "x" }), { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("更新フィールドがない場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);

    const res = await PATCH(makeRequest({}), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("no が重複する場合は 409", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique)
      .mockResolvedValueOnce(mockTarget as never)
      .mockResolvedValueOnce({ id: 2, name: "other", no: 2 } as never);

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

describe("DELETE /api/admin/targets/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は大分類を削除できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.target.delete).mockResolvedValue(mockTarget as never);

    const req = new Request("http://localhost/api/admin/targets/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(204);
  });

  it("categories が紐づく場合は 409", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.count).mockResolvedValue(2 as never);

    const req = new Request("http://localhost/api/admin/targets/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(409);
  });

  it("存在しない id の場合は 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/targets/999", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request("http://localhost/api/admin/targets/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("member の場合は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const req = new Request("http://localhost/api/admin/targets/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });
});
