// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluationAssignment: { findFirst: vi.fn() },
    evaluationSetting: { findUnique: vi.fn() },
    evaluation: { upsert: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const enabledSetting = { id: "s-1", user_id: "user-2", fiscal_year: 2025, self_evaluation_enabled: true };

const makeParams = (id: string, year: string, itemId: string) =>
  Promise.resolve({ id, year, itemId });

const adminSession = { user: { id: "admin-1", role: "admin" } };
const selfSession = { user: { id: "user-2", role: "member" } };
const evaluatorSession = { user: { id: "user-1", role: "member" } };
const otherSession = { user: { id: "other-99", role: "member" } };

const mockUpsertResult = {
  id: "eval-1",
  fiscal_year: 2025,
  evaluatee_id: "user-2",
  eval_item_id: 1,
  self_score: "ryo",
  self_reason: "理由",
  manager_score: null,
  manager_reason: null,
};

describe("PUT /api/members/:id/evaluations/:year/:itemId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("本人は self_score/self_reason を更新できる", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);
    vi.mocked(prisma.evaluationSetting.findUnique).mockResolvedValue(enabledSetting);
    vi.mocked(prisma.evaluation.upsert).mockResolvedValue(mockUpsertResult as never);

    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ self_score: "ryo", self_reason: "理由" }),
      }),
      { params: makeParams("user-2", "2025", "1") },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({ eval_item_id: 1, self_score: "ryo" });
    expect(prisma.evaluationAssignment.findFirst).not.toHaveBeenCalled();
  });

  it("admin は manager_score/manager_reason を更新できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluation.upsert).mockResolvedValue({
      ...mockUpsertResult,
      manager_score: "yu",
      manager_reason: "管理者コメント",
    } as never);

    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ manager_score: "yu", manager_reason: "管理者コメント" }),
      }),
      { params: makeParams("user-2", "2025", "1") },
    );

    expect(res.status).toBe(200);
    expect(prisma.evaluationAssignment.findFirst).not.toHaveBeenCalled();
  });

  it("アサインされた評価者は manager_score/manager_reason を更新できる", async () => {
    vi.mocked(getSession).mockResolvedValue(evaluatorSession as never);
    vi.mocked(prisma.evaluationAssignment.findFirst).mockResolvedValue({
      id: "assign-1",
      fiscal_year: 2025,
      evaluatee_id: "user-2",
      evaluator_id: "user-1",
    });
    vi.mocked(prisma.evaluation.upsert).mockResolvedValue({
      ...mockUpsertResult,
      manager_score: "ryo",
      manager_reason: "コメント",
    } as never);

    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ manager_score: "ryo", manager_reason: "コメント" }),
      }),
      { params: makeParams("user-2", "2025", "1") },
    );

    expect(res.status).toBe(200);
  });

  it("本人が manager_score を更新しようとすると 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);

    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ manager_score: "yu" }),
      }),
      { params: makeParams("user-2", "2025", "1") },
    );

    expect(res.status).toBe(403);
    expect(prisma.evaluation.upsert).not.toHaveBeenCalled();
  });

  it("アサインされた評価者が self_score を更新しようとすると 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(evaluatorSession as never);
    vi.mocked(prisma.evaluationAssignment.findFirst).mockResolvedValue({
      id: "assign-1",
      fiscal_year: 2025,
      evaluatee_id: "user-2",
      evaluator_id: "user-1",
    });

    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ self_score: "ryo" }),
      }),
      { params: makeParams("user-2", "2025", "1") },
    );

    expect(res.status).toBe(403);
    expect(prisma.evaluation.upsert).not.toHaveBeenCalled();
  });

  it("アサインされていない第三者は 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(otherSession as never);
    vi.mocked(prisma.evaluationAssignment.findFirst).mockResolvedValue(null);

    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ manager_score: "ryo" }),
      }),
      { params: makeParams("user-2", "2025", "1") },
    );

    expect(res.status).toBe(403);
    expect(prisma.evaluation.upsert).not.toHaveBeenCalled();
  });

  it("未認証の場合は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ self_score: "ryo" }),
      }),
      { params: makeParams("user-2", "2025", "1") },
    );

    expect(res.status).toBe(401);
  });

  it("year が数値以外の場合は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);

    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ self_score: "ryo" }),
      }),
      { params: makeParams("user-2", "abc", "1") },
    );

    expect(res.status).toBe(400);
  });

  it("自己評価不要のユーザーが self_score を更新しようとすると 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);
    vi.mocked(prisma.evaluationSetting.findUnique).mockResolvedValue(null);

    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ self_score: "ryo" }),
      }),
      { params: makeParams("user-2", "2025", "1") },
    );

    expect(res.status).toBe(403);
    expect(prisma.evaluation.upsert).not.toHaveBeenCalled();
  });

  it("self_evaluation_enabled=false のユーザーが self_score を更新しようとすると 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);
    vi.mocked(prisma.evaluationSetting.findUnique).mockResolvedValue({
      ...enabledSetting,
      self_evaluation_enabled: false,
    });

    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ self_score: "ryo" }),
      }),
      { params: makeParams("user-2", "2025", "1") },
    );

    expect(res.status).toBe(403);
    expect(prisma.evaluation.upsert).not.toHaveBeenCalled();
  });
});
