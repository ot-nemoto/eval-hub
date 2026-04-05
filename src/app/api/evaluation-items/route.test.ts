// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluationItem: { findMany: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockTarget = { id: 1, name: "employee", no: 1 };
const mockCategory = { id: 1, targetId: 1, name: "engagement", no: 1 };
const mockItems = [
  {
    id: 1,
    targetId: 1,
    categoryId: 1,
    no: 1,
    name: "会社員としての基本姿勢",
    description: "説明",
    evalCriteria: "基準",
    target: mockTarget,
    category: mockCategory,
  },
  {
    id: 2,
    targetId: 1,
    categoryId: 1,
    no: 2,
    name: "積極性",
    description: null,
    evalCriteria: null,
    target: mockTarget,
    category: mockCategory,
  },
];

describe("GET /api/evaluation-items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("認証済みユーザーに評価項目一覧を返す", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } } as never);
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue(mockItems as never);

    const req = new Request("http://localhost/api/evaluation-items");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("?targetId でフィルタできる", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } } as never);
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue([mockItems[0]] as never);

    const req = new Request("http://localhost/api/evaluation-items?targetId=1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.evaluationItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ targetId: 1 }),
      }),
    );
  });

  it("?categoryId でフィルタできる", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } } as never);
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue(mockItems as never);

    const req = new Request("http://localhost/api/evaluation-items?categoryId=1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.evaluationItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: 1 }),
      }),
    );
  });

  it("?targetId が不正値の場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } } as never);
    const res = await GET(new Request("http://localhost/api/evaluation-items?targetId=abc"));
    expect(res.status).toBe(400);
  });

  it("?categoryId が不正値の場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } } as never);
    const res = await GET(new Request("http://localhost/api/evaluation-items?categoryId=abc"));
    expect(res.status).toBe(400);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const req = new Request("http://localhost/api/evaluation-items");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(prisma.evaluationItem.findMany).not.toHaveBeenCalled();
  });
});
