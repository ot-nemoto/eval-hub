// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluationItem: { findMany: vi.fn(), upsert: vi.fn() },
    target: { upsert: vi.fn() },
    category: { upsert: vi.fn() },
    $transaction: vi.fn((cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        target: { upsert: vi.mocked(prisma.target.upsert) },
        category: { upsert: vi.mocked(prisma.category.upsert) },
        evaluationItem: { upsert: vi.mocked(prisma.evaluationItem.upsert) },
      }),
    ),
  },
}));

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { GET, POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/evaluation-items", {
    method: body !== undefined ? "POST" : "GET",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as import("next/server").NextRequest;
}

const mockItem = {
  id: 1,
  no: 1,
  name: "item A",
  description: null,
  evalCriteria: null,
  target: { id: 1, no: 1, name: "社員" },
  category: { id: 1, no: 1, name: "エンゲージメント" },
};

describe("GET /api/evaluation-items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ADMIN の場合は評価項目一覧を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue([mockItem] as never);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta.total).toBe(1);
  });

  it("API キーが無効な場合は 401 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("MEMBER の場合は 403 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });
});

describe("POST /api/evaluation-items", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = [
    {
      no: 1,
      name: "社員",
      categories: [
        {
          no: 1,
          name: "エンゲージメント",
          items: [{ no: 1, name: "item A", description: null, evalCriteria: null }],
        },
      ],
    },
  ];

  it("有効なリクエストで upsert を実行して結果を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(prisma.target.upsert).mockResolvedValue({ id: 1, no: 1, name: "社員" } as never);
    vi.mocked(prisma.category.upsert).mockResolvedValue({
      id: 1,
      no: 1,
      name: "エンゲージメント",
    } as never);
    vi.mocked(prisma.evaluationItem.upsert).mockResolvedValue(mockItem as never);

    const res = await POST(makeRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.upserted).toBe(1);
    expect(prisma.target.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.category.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.evaluationItem.upsert).toHaveBeenCalledTimes(1);
  });

  it("API キーが無効な場合は 401 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("MEMBER の場合は 403 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  it("配列でない body は 400 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);

    const res = await POST(makeRequest({ not: "array" }));
    expect(res.status).toBe(400);
  });

  it("空配列は 400 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);

    const res = await POST(makeRequest([]));
    expect(res.status).toBe(400);
  });

  it("大項目に name がない場合は 400 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);

    const res = await POST(makeRequest([{ no: 1, categories: [] }]));
    expect(res.status).toBe(400);
  });

  it("中項目に no がない場合は 400 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);

    const res = await POST(makeRequest([{ no: 1, name: "T", categories: [{ name: "C", items: [] }] }]));
    expect(res.status).toBe(400);
  });

  it("評価項目に name がない場合は 400 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);

    const res = await POST(
      makeRequest([
        { no: 1, name: "T", categories: [{ no: 1, name: "C", items: [{ no: 1 }] }] },
      ]),
    );
    expect(res.status).toBe(400);
  });

  it("不正な JSON は 400 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);

    const req = new Request("http://localhost/api/evaluation-items", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: "Bearer key" },
      body: "not-json",
    }) as import("next/server").NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
