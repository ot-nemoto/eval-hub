// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth, currentUser } from "@clerk/nextjs/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockCurrentUser = vi.mocked(currentUser);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdateMany = vi.mocked(prisma.user.updateMany);
const mockCreate = vi.mocked(prisma.user.create);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSession", () => {
  describe("MOCK_USER_ID モード（非本番環境）", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, NODE_ENV: "development", MOCK_USER_ID: "mock-user-id" };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("MOCK_USER_ID に対応する DB ユーザーのセッションを返す", async () => {
      // @ts-expect-error
      mockFindUnique.mockResolvedValue({
        id: "mock-user-id",
        name: "モックユーザー",
        role: "admin",
        isActive: true,
      });

      const result = await getSession();
      expect(result).toEqual({
        user: { id: "mock-user-id", name: "モックユーザー", role: "admin" },
      });
      expect(mockAuth).not.toHaveBeenCalled();
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "mock-user-id" },
        select: { id: true, name: true, role: true, isActive: true },
      });
    });

    it("MOCK_USER_ID に対応する DB ユーザーが存在しない場合は null を返す", async () => {
      // @ts-expect-error
      mockFindUnique.mockResolvedValue(null);

      const result = await getSession();
      expect(result).toBeNull();
      expect(mockAuth).not.toHaveBeenCalled();
    });

    it("isActive: false のユーザーは null を返す", async () => {
      // @ts-expect-error
      mockFindUnique.mockResolvedValue({
        id: "mock-user-id",
        name: "無効ユーザー",
        role: "member",
        isActive: false,
      });

      const result = await getSession();
      expect(result).toBeNull();
    });
  });

  describe("MOCK_USER_EMAIL モード（非本番環境）", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        NODE_ENV: "development",
        MOCK_USER_EMAIL: "mock@example.com",
      };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("MOCK_USER_EMAIL に対応する DB ユーザーのセッションを返す", async () => {
      // @ts-expect-error
      mockFindUnique.mockResolvedValue({
        id: "user-uuid",
        name: "モックユーザー",
        role: "member",
        isActive: true,
      });

      const result = await getSession();
      expect(result).toEqual({ user: { id: "user-uuid", name: "モックユーザー", role: "member" } });
      expect(mockAuth).not.toHaveBeenCalled();
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "mock@example.com" },
        select: { id: true, name: true, role: true, isActive: true },
      });
    });

    it("MOCK_USER_EMAIL に対応する DB ユーザーが存在しない場合は null を返す", async () => {
      // @ts-expect-error
      mockFindUnique.mockResolvedValue(null);

      const result = await getSession();
      expect(result).toBeNull();
      expect(mockAuth).not.toHaveBeenCalled();
    });

    it("isActive: false のユーザーは null を返す", async () => {
      // @ts-expect-error
      mockFindUnique.mockResolvedValue({
        id: "user-uuid",
        name: "無効ユーザー",
        role: "member",
        isActive: false,
      });

      const result = await getSession();
      expect(result).toBeNull();
    });

    it("MOCK_USER_ID と MOCK_USER_EMAIL が両方設定された場合は MOCK_USER_ID が優先される", async () => {
      process.env.MOCK_USER_ID = "priority-user-id";
      // @ts-expect-error
      mockFindUnique.mockResolvedValue({
        id: "priority-user-id",
        name: "優先ユーザー",
        role: "admin",
        isActive: true,
      });

      const result = await getSession();
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "priority-user-id" },
        select: { id: true, name: true, role: true, isActive: true },
      });
      expect(result?.user.id).toBe("priority-user-id");
    });
  });

  it("Clerkにユーザーがいない場合はnullを返す", async () => {
    // @ts-expect-error
    mockAuth.mockResolvedValue({ userId: null });

    const result = await getSession();
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("正常系: clerkIdに対応するDBユーザーが存在する場合はセッションを返す", async () => {
    // @ts-expect-error
    mockAuth.mockResolvedValue({ userId: "clerk_abc123" });
    // @ts-expect-error
    mockFindUnique.mockResolvedValue({
      id: "user-uuid",
      name: "テストユーザー",
      role: "member",
      isActive: true,
    });

    const result = await getSession();
    expect(result).toEqual({
      user: { id: "user-uuid", name: "テストユーザー", role: "member" },
    });
    expect(mockCurrentUser).not.toHaveBeenCalled();
  });

  it("clerkId で見つかったユーザーが isActive: false の場合は null を返す", async () => {
    // @ts-expect-error
    mockAuth.mockResolvedValue({ userId: "clerk_abc123" });
    // @ts-expect-error
    mockFindUnique.mockResolvedValue({
      id: "user-uuid",
      name: "無効ユーザー",
      role: "member",
      isActive: false,
    });

    const result = await getSession();
    expect(result).toBeNull();
  });

  it("adminロールのユーザーも正しく返す", async () => {
    // @ts-expect-error
    mockAuth.mockResolvedValue({ userId: "clerk_admin123" });
    // @ts-expect-error
    mockFindUnique.mockResolvedValue({
      id: "admin-uuid",
      name: "管理者",
      role: "admin",
      isActive: true,
    });

    const result = await getSession();
    expect(result?.user.role).toBe("admin");
  });

  describe("初回ログイン時の clerkId 自動紐付け", () => {
    it("メールアドレスが一致するDBユーザーに clerkId を紐付けてセッションを返す", async () => {
      // @ts-expect-error
      mockAuth.mockResolvedValue({ userId: "clerk_new123" });
      // @ts-expect-error
      mockFindUnique
        .mockResolvedValueOnce(null) // clerkId 検索 → 未ヒット
        // @ts-expect-error
        .mockResolvedValueOnce({
          id: "user-uuid",
          name: "田中太郎",
          role: "member",
          clerkId: null,
          isActive: true,
        }); // email 検索
      // @ts-expect-error
      mockCurrentUser.mockResolvedValue({
        emailAddresses: [{ emailAddress: "tanaka@example.com" }],
      });
      // @ts-expect-error
      mockUpdateMany.mockResolvedValue({ count: 1 });

      const result = await getSession();
      expect(result).toEqual({
        user: { id: "user-uuid", name: "田中太郎", role: "member" },
      });
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { email: "tanaka@example.com", clerkId: null },
        data: { clerkId: "clerk_new123" },
      });
    });

    it("並行リクエストで先に clerkId が紐付け済みの場合は既存レコードを返す", async () => {
      // @ts-expect-error
      mockAuth.mockResolvedValue({ userId: "clerk_new123" });
      // @ts-expect-error
      mockFindUnique
        .mockResolvedValueOnce(null) // clerkId 検索 → 未ヒット
        // @ts-expect-error
        .mockResolvedValueOnce({
          id: "user-uuid",
          name: "田中太郎",
          role: "member",
          clerkId: null,
          isActive: true,
        }) // email 検索
        // @ts-expect-error
        .mockResolvedValueOnce({
          id: "user-uuid",
          name: "田中太郎",
          role: "member",
          isActive: true,
        }); // updateMany count=0 後の再取得
      // @ts-expect-error
      mockCurrentUser.mockResolvedValue({
        emailAddresses: [{ emailAddress: "tanaka@example.com" }],
      });
      // @ts-expect-error
      mockUpdateMany.mockResolvedValue({ count: 0 }); // 別リクエストが先に紐付け済み

      const result = await getSession();
      expect(result).toEqual({
        user: { id: "user-uuid", name: "田中太郎", role: "member" },
      });
    });

    it("DBに存在しない新規サインアップユーザーを自動作成してセッションを返す", async () => {
      // @ts-expect-error
      mockAuth.mockResolvedValue({ userId: "clerk_new123" });
      // @ts-expect-error
      mockFindUnique
        .mockResolvedValueOnce(null) // clerkId 検索 → 未ヒット
        .mockResolvedValueOnce(null); // email 検索 → 未ヒット
      // @ts-expect-error
      mockCurrentUser.mockResolvedValue({
        emailAddresses: [{ emailAddress: "new@example.com" }],
        fullName: "新規ユーザー",
        firstName: null,
      });
      // @ts-expect-error
      mockCreate.mockResolvedValue({ id: "new-uuid", name: "新規ユーザー", role: "member" });

      const result = await getSession();
      expect(result).toEqual({
        user: { id: "new-uuid", name: "新規ユーザー", role: "member" },
      });
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          clerkId: "clerk_new123",
          email: "new@example.com",
          name: "新規ユーザー",
          role: "member",
        },
        select: { id: true, name: true, role: true },
      });
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it("既に別の clerkId に紐付き済みのDBユーザーはnullを返す", async () => {
      // @ts-expect-error
      mockAuth.mockResolvedValue({ userId: "clerk_new123" });
      // @ts-expect-error
      mockFindUnique
        .mockResolvedValueOnce(null) // clerkId 検索 → 未ヒット
        // @ts-expect-error
        .mockResolvedValueOnce({
          id: "user-uuid",
          name: "田中太郎",
          role: "member",
          clerkId: "clerk_other",
          isActive: true,
        }); // email 検索 → 別IDに紐付き済み
      // @ts-expect-error
      mockCurrentUser.mockResolvedValue({
        emailAddresses: [{ emailAddress: "tanaka@example.com" }],
      });

      const result = await getSession();
      expect(result).toBeNull();
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it("email で見つかったユーザーが isActive: false の場合は null を返す", async () => {
      // @ts-expect-error
      mockAuth.mockResolvedValue({ userId: "clerk_new123" });
      // @ts-expect-error
      mockFindUnique
        .mockResolvedValueOnce(null) // clerkId 検索 → 未ヒット
        // @ts-expect-error
        .mockResolvedValueOnce({
          id: "user-uuid",
          name: "無効ユーザー",
          role: "member",
          clerkId: null,
          isActive: false,
        }); // email 検索
      // @ts-expect-error
      mockCurrentUser.mockResolvedValue({
        emailAddresses: [{ emailAddress: "tanaka@example.com" }],
      });

      const result = await getSession();
      expect(result).toBeNull();
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it("Clerkのメールアドレスが取得できない場合はnullを返す", async () => {
      // @ts-expect-error
      mockAuth.mockResolvedValue({ userId: "clerk_new123" });
      // @ts-expect-error
      mockFindUnique.mockResolvedValueOnce(null);
      // @ts-expect-error
      mockCurrentUser.mockResolvedValue({ emailAddresses: [] });

      const result = await getSession();
      expect(result).toBeNull();
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });
  });
});
