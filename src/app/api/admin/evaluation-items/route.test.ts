// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluationItem: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "admin" } };
const memberSession = { user: { id: "member-1", role: "member" } };

const mockItems = [
  {
    uid: "1-1-1",
    target: "employee",
    target_no: 1,
    category: "engagement",
    category_no: 1,
    item_no: 1,
    name: "会社員としての基本姿勢",
    description: null,
    eval_criteria: null,
  },
];

describe("GET /api/admin/evaluation-items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin は評価項目一覧を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue(mockItems as never);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("member の場合は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const res = await GET();
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/evaluation-items", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = {
    uid: "1-1-2",
    target: "employee",
    target_no: 1,
    category: "engagement",
    category_no: 1,
    item_no: 2,
    name: "新しい評価項目",
  };

  it("admin は新しい評価項目を追加できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.evaluationItem.create).mockResolvedValue({ ...validBody, description: null, eval_criteria: null } as never);

    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.uid).toBe("1-1-2");
  });

  it("UID が重複している場合は 409", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItems[0] as never);

    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify({ ...validBody, uid: "1-1-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("uid が不足している場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const { uid: _uid, ...withoutUid } = validBody;
    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify(withoutUid),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("name が不足している場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const { name: _name, ...withoutName } = validBody;
    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify(withoutName),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("item_no が小数の場合は 400", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify({ ...validBody, item_no: 1.5 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("member の場合は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const req = new Request("http://localhost/api/admin/evaluation-items", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
