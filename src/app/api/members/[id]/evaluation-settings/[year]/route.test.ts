// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    evaluationSetting: { upsert: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "admin" } };
const memberSession = { user: { id: "member-1", role: "member" } };

const mockUser = { id: "member-1", name: "山田太郎" };

function makeParams(id: string, year: string) {
  return { params: Promise.resolve({ id, year }) };
}

describe("PUT /api/members/:id/evaluation-settings/:year", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は自己評価要否を更新できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.evaluationSetting.upsert).mockResolvedValue({
      id: "setting-1",
      userId: "member-1",
      fiscalYear: 2026,
      selfEvaluationEnabled: false,
    } as never);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ selfEvaluationEnabled: false }),
    });
    const res = await PUT(req, makeParams("member-1", "2026"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({ fiscalYear: 2026, selfEvaluationEnabled: false });
  });

  it("member は更新できない（403）", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ selfEvaluationEnabled: false }),
    });
    const res = await PUT(req, makeParams("member-1", "2026"));

    expect(res.status).toBe(403);
  });

  it("year が数値以外の場合は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ selfEvaluationEnabled: false }),
    });
    const res = await PUT(req, makeParams("member-1", "abc"));

    expect(res.status).toBe(400);
  });

  it("self_evaluation_enabled が boolean 以外の場合は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ selfEvaluationEnabled: "yes" }),
    });
    const res = await PUT(req, makeParams("member-1", "2026"));

    expect(res.status).toBe(400);
  });

  it("存在しないユーザーの場合は 404 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ selfEvaluationEnabled: false }),
    });
    const res = await PUT(req, makeParams("not-exist", "2026"));

    expect(res.status).toBe(404);
  });

  it("未認証の場合は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ selfEvaluationEnabled: false }),
    });
    const res = await PUT(req, makeParams("member-1", "2026"));

    expect(res.status).toBe(401);
  });
});
