// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluationAssignment: { findFirst: vi.fn() },
    evaluation: { findMany: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const makeParams = (id: string, year: string) => Promise.resolve({ id, year });

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };
const selfSession = { user: { id: "user-2", role: "MEMBER" } };
const evaluatorSession = { user: { id: "user-1", role: "MEMBER" } };
const otherSession = { user: { id: "other-99", role: "MEMBER" } };

const mockEvaluations = [
  {
    evalItemId: 1,
    fiscalYear: 2025,
    evaluateeId: "user-2",
    selfScore: "ryo",
    selfReason: "理由",
    managerScore: null,
    managerReason: null,
    evaluationItem: { name: "会社員としての基本姿勢" },
  },
];

describe("GET /api/members/:id/evaluations/:year", () => {
  beforeEach(() => vi.clearAllMocks());

  it("本人は自分の評価一覧を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue(mockEvaluations as never);

    const res = await GET(new Request("http://localhost"), {
      params: makeParams("user-2", "2025"),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ eval_item_id: 1, item_name: "会社員としての基本姿勢" });
  });

  it("admin は任意の評価一覧を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue(mockEvaluations as never);

    const res = await GET(new Request("http://localhost"), {
      params: makeParams("user-2", "2025"),
    });

    expect(res.status).toBe(200);
    expect(prisma.evaluationAssignment.findFirst).not.toHaveBeenCalled();
  });

  it("アサインされた評価者は取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(evaluatorSession as never);
    vi.mocked(prisma.evaluationAssignment.findFirst).mockResolvedValue({
      id: "assign-1",
      fiscalYear: 2025,
      evaluateeId: "user-2",
      evaluatorId: "user-1",
    });
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue(mockEvaluations as never);

    const res = await GET(new Request("http://localhost"), {
      params: makeParams("user-2", "2025"),
    });

    expect(res.status).toBe(200);
  });

  it("アサインされていない第三者は 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(otherSession as never);
    vi.mocked(prisma.evaluationAssignment.findFirst).mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), {
      params: makeParams("user-2", "2025"),
    });

    expect(res.status).toBe(403);
    expect(prisma.evaluation.findMany).not.toHaveBeenCalled();
  });

  it("未認証の場合は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), {
      params: makeParams("user-2", "2025"),
    });

    expect(res.status).toBe(401);
  });

  it("year が数値以外の場合は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);

    const res = await GET(new Request("http://localhost"), {
      params: makeParams("user-2", "abc"),
    });

    expect(res.status).toBe(400);
  });
});
