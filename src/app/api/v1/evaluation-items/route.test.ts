// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluationItem: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockItems = [
  {
    uid: "1-1-1",
    target: "employee",
    category: "engagement",
    name: "会社員としての基本姿勢",
    description: "説明",
    eval_criteria: "基準",
    two_year_rule: false,
  },
  {
    uid: "1-1-2",
    target: "employee",
    category: "engagement",
    name: "積極性",
    description: null,
    eval_criteria: null,
    two_year_rule: false,
  },
];

describe("GET /api/v1/evaluation-items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証済みユーザーに評価項目一覧を返す", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1", role: "member" } } as never);
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue(mockItems);

    const req = new Request("http://localhost/api/v1/evaluation-items");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(mockItems);
  });

  it("target クエリで絞り込みができる", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1", role: "member" } } as never);
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue([mockItems[0]]);

    const req = new Request("http://localhost/api/v1/evaluation-items?target=employee");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.evaluationItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ target: "employee" }),
      }),
    );
    expect(body.data).toHaveLength(1);
  });

  it("category クエリで絞り込みができる", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1", role: "member" } } as never);
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue(mockItems);

    const req = new Request("http://localhost/api/v1/evaluation-items?category=engagement");
    const res = await GET(req);

    expect(prisma.evaluationItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: "engagement" }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it("未認証の場合は 401 を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = new Request("http://localhost/api/v1/evaluation-items");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(prisma.evaluationItem.findMany).not.toHaveBeenCalled();
  });
});
