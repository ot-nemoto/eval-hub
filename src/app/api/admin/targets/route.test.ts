// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    target: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };
const memberSession = { user: { id: "member-1", role: "MEMBER" } };

const mockTargets = [
  { id: 1, name: "employee", no: 1 },
  { id: 2, name: "projects", no: 2 },
];

describe("GET /api/admin/targets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は大分類一覧を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findMany).mockResolvedValue(mockTargets as never);

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

describe("POST /api/admin/targets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は大分類を追加できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.target.create).mockResolvedValue({
      id: 3,
      name: "new target",
      no: 3,
    } as never);

    const req = new Request("http://localhost/api/admin/targets", {
      method: "POST",
      body: JSON.stringify({ name: "new target", no: 3 }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.name).toBe("new target");
  });

  it("name が空文字の場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    const req = new Request("http://localhost/api/admin/targets", {
      method: "POST",
      body: JSON.stringify({ name: "", no: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("name がない場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/targets", {
      method: "POST",
      body: JSON.stringify({ no: 3 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("no がない場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/targets", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("no が 0 以下の場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/targets", {
      method: "POST",
      body: JSON.stringify({ name: "test", no: 0 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("同じ no がすでに存在する場合は 409", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTargets[0] as never);

    const req = new Request("http://localhost/api/admin/targets", {
      method: "POST",
      body: JSON.stringify({ name: "dup", no: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request("http://localhost/api/admin/targets", {
      method: "POST",
      body: JSON.stringify({ name: "x", no: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("member の場合は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const req = new Request("http://localhost/api/admin/targets", {
      method: "POST",
      body: JSON.stringify({ name: "x", no: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
