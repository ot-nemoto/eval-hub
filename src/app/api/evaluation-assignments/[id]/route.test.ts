// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluationAssignment: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };
const memberSession = { user: { id: "member-1", role: "MEMBER" } };

const mockAssignment = {
  id: "assign-1",
  fiscalYear: 2025,
  evaluateeId: "user-2",
  evaluatorId: "user-1",
};

const makeParams = (id: string) => Promise.resolve({ id });

describe("DELETE /api/evaluation-assignments/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin はアサインを削除できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationAssignment.findUnique).mockResolvedValue(mockAssignment);
    vi.mocked(prisma.evaluationAssignment.delete).mockResolvedValue(mockAssignment);

    const req = new Request("http://localhost/api/evaluation-assignments/assign-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: makeParams("assign-1") });

    expect(res.status).toBe(204);
    expect(prisma.evaluationAssignment.delete).toHaveBeenCalledWith({
      where: { id: "assign-1" },
    });
  });

  it("存在しない ID の場合は 404 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationAssignment.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/evaluation-assignments/not-exist", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: makeParams("not-exist") });

    expect(res.status).toBe(404);
  });

  it("未認証の場合は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const req = new Request("http://localhost/api/evaluation-assignments/assign-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: makeParams("assign-1") });

    expect(res.status).toBe(401);
  });

  it("member の場合は 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    const req = new Request("http://localhost/api/evaluation-assignments/assign-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: makeParams("assign-1") });

    expect(res.status).toBe(403);
  });
});
