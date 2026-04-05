// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluationAssignment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };
const memberSession = { user: { id: "member-1", role: "MEMBER" } };

const mockAssignments = [
  {
    id: "assign-1",
    fiscalYear: 2025,
    evaluateeId: "user-2",
    evaluatorId: "user-1",
    evaluatee: { id: "user-2", name: "鈴木花子" },
    evaluator: { id: "user-1", name: "田中太郎" },
  },
];

describe("GET /api/evaluation-assignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin はアサイン一覧を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationAssignment.findMany).mockResolvedValue(mockAssignments);

    const req = new Request("http://localhost/api/evaluation-assignments");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ id: "assign-1", fiscalYear: 2025 });
  });

  it("fiscalYear クエリで絞り込みができる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationAssignment.findMany).mockResolvedValue(mockAssignments);

    const req = new Request("http://localhost/api/evaluation-assignments?fiscalYear=2025");
    await GET(req);

    expect(prisma.evaluationAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { fiscalYear: 2025 } }),
    );
  });

  it("fiscalYear が数値以外の場合は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/evaluation-assignments?fiscalYear=abc");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it("未認証の場合は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const req = new Request("http://localhost/api/evaluation-assignments");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("member の場合は 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    const req = new Request("http://localhost/api/evaluation-assignments");
    const res = await GET(req);

    expect(res.status).toBe(403);
  });
});

describe("POST /api/evaluation-assignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin はアサインを作成できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationAssignment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.evaluationAssignment.create).mockResolvedValue({
      id: "assign-new",
      fiscalYear: 2025,
      evaluateeId: "user-2",
      evaluatorId: "user-1",
    });

    const req = new Request("http://localhost/api/evaluation-assignments", {
      method: "POST",
      body: JSON.stringify({ fiscalYear: 2025, evaluateeId: "user-2", evaluatorId: "user-1" }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toMatchObject({ fiscalYear: 2025 });
  });

  it("必須項目が欠けている場合は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/evaluation-assignments", {
      method: "POST",
      body: JSON.stringify({ fiscalYear: 2025 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("同一組み合わせが存在する場合は 409 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationAssignment.findUnique).mockResolvedValue(mockAssignments[0]);

    const req = new Request("http://localhost/api/evaluation-assignments", {
      method: "POST",
      body: JSON.stringify({ fiscalYear: 2025, evaluateeId: "user-2", evaluatorId: "user-1" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
  });

  it("未認証の場合は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const req = new Request("http://localhost/api/evaluation-assignments", {
      method: "POST",
      body: JSON.stringify({ fiscalYear: 2025, evaluateeId: "user-2", evaluatorId: "user-1" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("member の場合は 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    const req = new Request("http://localhost/api/evaluation-assignments", {
      method: "POST",
      body: JSON.stringify({ fiscalYear: 2025, evaluateeId: "user-2", evaluatorId: "user-1" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });
});
