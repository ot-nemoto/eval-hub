// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluation-assignments", () => ({
  getEvaluationAssignments: vi.fn(),
  createEvaluationAssignment: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { ConflictError } from "@/lib/errors";
import { createEvaluationAssignment, getEvaluationAssignments } from "@/lib/evaluation-assignments";
import { GET, POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

const listItem = {
  id: "a1",
  fiscalYear: 2025,
  evaluatee: { id: "e1", name: "被評価者" },
  evaluator: { id: "r1", name: "評価者" },
};
const created = { id: "a1", fiscalYear: 2025, evaluateeId: "e1", evaluatorId: "r1" };

function makeGet(query = "") {
  return new Request(`http://localhost/api/evaluation-assignments${query}`, {
    method: "GET",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}
function makePost(body: unknown) {
  return new Request("http://localhost/api/evaluation-assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

describe("GET /api/evaluation-assignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ADMIN は一覧を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getEvaluationAssignments).mockResolvedValue([listItem]);

    const res = await GET(makeGet());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ evaluationAssignments: [listItem] });
    expect(getEvaluationAssignments).toHaveBeenCalledWith({
      fiscalYear: undefined,
      evaluateeId: undefined,
    });
  });

  it("fiscalYear・evaluateeId で絞り込む", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getEvaluationAssignments).mockResolvedValue([]);

    await GET(makeGet("?fiscalYear=2025&evaluateeId=e1"));
    expect(getEvaluationAssignments).toHaveBeenCalledWith({ fiscalYear: 2025, evaluateeId: "e1" });
  });

  it("fiscalYear 不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await GET(makeGet("?fiscalYear=abc"))).status).toBe(400);
    expect(getEvaluationAssignments).not.toHaveBeenCalled();
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeGet())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeGet())).status).toBe(403);
  });
});

describe("POST /api/evaluation-assignments", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = { fiscalYear: 2025, evaluateeId: "e1", evaluatorId: "r1" };

  it("作成して 201（flat）を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createEvaluationAssignment).mockResolvedValue(created as never);

    const res = await POST(makePost(validBody));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body).toEqual(created);
    expect(createEvaluationAssignment).toHaveBeenCalledWith(validBody);
  });

  it("必須欠落・年度範囲外は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makePost({ fiscalYear: 2025, evaluateeId: "e1" }))).status).toBe(400);
    expect((await POST(makePost({ ...validBody, fiscalYear: 1800 }))).status).toBe(400);
    expect((await POST(makePost({ ...validBody, evaluateeId: "" }))).status).toBe(400);
    expect(createEvaluationAssignment).not.toHaveBeenCalled();
  });

  it("重複は 409", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createEvaluationAssignment).mockRejectedValue(
      new ConflictError("同一年度・被評価者・評価者の組み合わせがすでに存在します"),
    );
    expect((await POST(makePost(validBody))).status).toBe(409);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await POST(makePost(validBody))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await POST(makePost(validBody))).status).toBe(403);
  });
});
