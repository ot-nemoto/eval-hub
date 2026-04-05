// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    evaluationSetting: { findMany: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };
const memberSession = { user: { id: "member-1", role: "MEMBER" } };
const otherMemberSession = { user: { id: "member-2", role: "MEMBER" } };

const mockUser = { id: "member-1", name: "山田太郎" };
const mockSettings = [
  { fiscalYear: 2026, selfEvaluationEnabled: true },
  { fiscalYear: 2025, selfEvaluationEnabled: false },
];

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/members/:id/evaluation-settings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は任意ユーザーの設定を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.evaluationSetting.findMany).mockResolvedValue(mockSettings as never);

    const res = await GET(new Request("http://localhost"), makeParams("member-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toMatchObject({ fiscalYear: 2026, selfEvaluationEnabled: true });
  });

  it("本人は自分の設定を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.evaluationSetting.findMany).mockResolvedValue(mockSettings as never);

    const res = await GET(new Request("http://localhost"), makeParams("member-1"));

    expect(res.status).toBe(200);
  });

  it("他のユーザーの設定は取得できない（403）", async () => {
    vi.mocked(getSession).mockResolvedValue(otherMemberSession as never);

    const res = await GET(new Request("http://localhost"), makeParams("member-1"));

    expect(res.status).toBe(403);
  });

  it("存在しないユーザーの場合は 404 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), makeParams("not-exist"));

    expect(res.status).toBe(404);
  });

  it("未認証の場合は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), makeParams("member-1"));

    expect(res.status).toBe(401);
  });
});
