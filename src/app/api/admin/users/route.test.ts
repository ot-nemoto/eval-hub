// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };
const memberSession = { user: { id: "member-1", role: "MEMBER" } };

const mockUsers = [
  {
    id: "user-1",
    name: "田中太郎",
    email: "tanaka@example.com",
    role: "ADMIN",
    division: "開発部",
    joinedAt: null,
    createdAt: new Date("2025-01-01"),
  },
  {
    id: "user-2",
    name: "鈴木花子",
    email: "suzuki@example.com",
    role: "MEMBER",
    division: null,
    joinedAt: null,
    createdAt: new Date("2025-02-01"),
  },
];

describe("GET /api/admin/users", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin はユーザー一覧を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as never);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toMatchObject({ id: "user-1", name: "田中太郎" });
  });

  it("未認証の場合は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("member の場合は 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    const res = await GET();

    expect(res.status).toBe(403);
  });
});
