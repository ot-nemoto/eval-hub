// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const mockAuth = vi.mocked(auth);
const mockFindUnique = vi.mocked(prisma.user.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSession", () => {
  it("Clerkにユーザーがいない場合はnullを返す", async () => {
    // @ts-ignore
    mockAuth.mockResolvedValue({ userId: null });

    const result = await getSession();
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("clerk_idに対応するDBユーザーが存在しない場合はnullを返す", async () => {
    // @ts-ignore
    mockAuth.mockResolvedValue({ userId: "clerk_abc123" });
    // @ts-ignore
    mockFindUnique.mockResolvedValue(null);

    const result = await getSession();
    expect(result).toBeNull();
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { clerk_id: "clerk_abc123" },
      select: { id: true, name: true, role: true },
    });
  });

  it("正常系: DBユーザーが存在する場合はセッションを返す", async () => {
    // @ts-ignore
    mockAuth.mockResolvedValue({ userId: "clerk_abc123" });
    // @ts-ignore
    mockFindUnique.mockResolvedValue({
      id: "user-uuid",
      name: "テストユーザー",
      role: "member",
    });

    const result = await getSession();
    expect(result).toEqual({
      user: {
        id: "user-uuid",
        name: "テストユーザー",
        role: "member",
      },
    });
  });

  it("adminロールのユーザーも正しく返す", async () => {
    // @ts-ignore
    mockAuth.mockResolvedValue({ userId: "clerk_admin123" });
    // @ts-ignore
    mockFindUnique.mockResolvedValue({
      id: "admin-uuid",
      name: "管理者",
      role: "admin",
    });

    const result = await getSession();
    expect(result?.user.role).toBe("admin");
  });
});
