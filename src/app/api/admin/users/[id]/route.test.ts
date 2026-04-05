// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    evaluationAssignment: { count: vi.fn() },
    evaluation: { count: vi.fn() },
    evaluationSetting: { count: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };
const memberSession = { user: { id: "member-1", role: "MEMBER" } };

const mockUser = {
  id: "user-2",
  name: "鈴木花子",
  email: "suzuki@example.com",
  role: "MEMBER",
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/admin/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は他ユーザーのロールを変更できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, role: "ADMIN" } as never);

    const req = new Request("http://localhost/api/admin/users/user-2", {
      method: "PATCH",
      body: JSON.stringify({ role: "ADMIN" }),
    });
    const res = await PATCH(req, makeParams("user-2"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.role).toBe("ADMIN");
  });

  it("admin はユーザーを無効化できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, isActive: false } as never);

    const req = new Request("http://localhost/api/admin/users/user-2", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });
    const res = await PATCH(req, makeParams("user-2"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.isActive).toBe(false);
  });

  it("自分自身のロールは変更できない（403）", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/users/admin-1", {
      method: "PATCH",
      body: JSON.stringify({ role: "MEMBER" }),
    });
    const res = await PATCH(req, makeParams("admin-1"));

    expect(res.status).toBe(403);
  });

  it("role も isActive も指定しない場合は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/users/user-2", {
      method: "PATCH",
      body: JSON.stringify({ role: "superuser" }),
    });
    const res = await PATCH(req, makeParams("user-2"));

    expect(res.status).toBe(400);
  });

  it("存在しないユーザーの場合は 404 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/users/not-exist", {
      method: "PATCH",
      body: JSON.stringify({ role: "ADMIN" }),
    });
    const res = await PATCH(req, makeParams("not-exist"));

    expect(res.status).toBe(404);
  });

  it("未認証の場合は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/users/user-2", {
      method: "PATCH",
      body: JSON.stringify({ role: "ADMIN" }),
    });
    const res = await PATCH(req, makeParams("user-2"));

    expect(res.status).toBe(401);
  });

  it("member の場合は 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    const req = new Request("http://localhost/api/admin/users/user-2", {
      method: "PATCH",
      body: JSON.stringify({ role: "ADMIN" }),
    });
    const res = await PATCH(req, makeParams("user-2"));

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("関連データがないユーザーを削除できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.evaluationAssignment.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluationSetting.count).mockResolvedValue(0);
    vi.mocked(prisma.user.delete).mockResolvedValue(mockUser as never);

    const req = new Request("http://localhost/api/admin/users/user-2", { method: "DELETE" });
    const res = await DELETE(req, makeParams("user-2"));

    expect(res.status).toBe(204);
  });

  it("自分自身は削除できない（403）", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/users/admin-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("admin-1"));

    expect(res.status).toBe(403);
  });

  it("存在しないユーザーの場合は 404 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/users/not-exist", { method: "DELETE" });
    const res = await DELETE(req, makeParams("not-exist"));

    expect(res.status).toBe(404);
  });

  it("evaluation_assignments があるユーザーは削除できない（409）", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.evaluationAssignment.count).mockResolvedValue(2);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluationSetting.count).mockResolvedValue(0);

    const req = new Request("http://localhost/api/admin/users/user-2", { method: "DELETE" });
    const res = await DELETE(req, makeParams("user-2"));

    expect(res.status).toBe(409);
  });

  it("evaluation_settings があるユーザーは削除できない（409）", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.evaluationAssignment.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluationSetting.count).mockResolvedValue(1);

    const req = new Request("http://localhost/api/admin/users/user-2", { method: "DELETE" });
    const res = await DELETE(req, makeParams("user-2"));

    expect(res.status).toBe(409);
  });

  it("未認証の場合は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/users/user-2", { method: "DELETE" });
    const res = await DELETE(req, makeParams("user-2"));

    expect(res.status).toBe(401);
  });

  it("member の場合は 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    const req = new Request("http://localhost/api/admin/users/user-2", { method: "DELETE" });
    const res = await DELETE(req, makeParams("user-2"));

    expect(res.status).toBe(403);
  });
});
