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
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
      // @ts-ignore
      mockFindUnique.mockResolvedValue({ id: "mock-user-id", name: "モックユーザー", role: "admin" });

      const result = await getSession();
      expect(result).toEqual({ user: { id: "mock-user-id", name: "モックユーザー", role: "admin" } });
      expect(mockAuth).not.toHaveBeenCalled();
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "mock-user-id" },
        select: { id: true, name: true, role: true },
      });
    });

    it("MOCK_USER_ID に対応する DB ユーザーが存在しない場合は null を返す", async () => {
      // @ts-ignore
      mockFindUnique.mockResolvedValue(null);

      const result = await getSession();
      expect(result).toBeNull();
      expect(mockAuth).not.toHaveBeenCalled();
    });
  });

  it("Clerkにユーザーがいない場合はnullを返す", async () => {
    // @ts-ignore
    mockAuth.mockResolvedValue({ userId: null });

    const result = await getSession();
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("正常系: clerk_idに対応するDBユーザーが存在する場合はセッションを返す", async () => {
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
      user: { id: "user-uuid", name: "テストユーザー", role: "member" },
    });
    expect(mockCurrentUser).not.toHaveBeenCalled();
  });

  it("adminロールのユーザーも正しく返す", async () => {
    // @ts-ignore
    mockAuth.mockResolvedValue({ userId: "clerk_admin123" });
    // @ts-ignore
    mockFindUnique.mockResolvedValue({ id: "admin-uuid", name: "管理者", role: "admin" });

    const result = await getSession();
    expect(result?.user.role).toBe("admin");
  });

  describe("初回ログイン時の clerk_id 自動紐付け", () => {
    it("メールアドレスが一致するDBユーザーに clerk_id を紐付けてセッションを返す", async () => {
      // @ts-ignore
      mockAuth.mockResolvedValue({ userId: "clerk_new123" });
      // @ts-ignore
      mockFindUnique
        .mockResolvedValueOnce(null) // clerk_id 検索 → 未ヒット
        // @ts-ignore
        .mockResolvedValueOnce({ id: "user-uuid", name: "田中太郎", role: "member", clerk_id: null }) // email 検索
        // @ts-ignore
        .mockResolvedValueOnce({ id: "user-uuid", name: "田中太郎", role: "member" }); // updateMany 後の再取得
      // @ts-ignore
      mockCurrentUser.mockResolvedValue({
        emailAddresses: [{ emailAddress: "tanaka@example.com" }],
      });
      // @ts-ignore
      mockUpdateMany.mockResolvedValue({ count: 1 });

      const result = await getSession();
      expect(result).toEqual({
        user: { id: "user-uuid", name: "田中太郎", role: "member" },
      });
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { email: "tanaka@example.com", clerk_id: null },
        data: { clerk_id: "clerk_new123" },
      });
    });

    it("並行リクエストで先に clerk_id が紐付け済みの場合は既存レコードを返す", async () => {
      // @ts-ignore
      mockAuth.mockResolvedValue({ userId: "clerk_new123" });
      // @ts-ignore
      mockFindUnique
        .mockResolvedValueOnce(null) // clerk_id 検索 → 未ヒット
        // @ts-ignore
        .mockResolvedValueOnce({ id: "user-uuid", name: "田中太郎", role: "member", clerk_id: null }) // email 検索
        // @ts-ignore
        .mockResolvedValueOnce({ id: "user-uuid", name: "田中太郎", role: "member" }); // updateMany count=0 後の再取得
      // @ts-ignore
      mockCurrentUser.mockResolvedValue({
        emailAddresses: [{ emailAddress: "tanaka@example.com" }],
      });
      // @ts-ignore
      mockUpdateMany.mockResolvedValue({ count: 0 }); // 別リクエストが先に紐付け済み

      const result = await getSession();
      expect(result).toEqual({
        user: { id: "user-uuid", name: "田中太郎", role: "member" },
      });
    });

    it("DBに存在しない新規サインアップユーザーを自動作成してセッションを返す", async () => {
      // @ts-ignore
      mockAuth.mockResolvedValue({ userId: "clerk_new123" });
      // @ts-ignore
      mockFindUnique
        .mockResolvedValueOnce(null) // clerk_id 検索 → 未ヒット
        .mockResolvedValueOnce(null); // email 検索 → 未ヒット
      // @ts-ignore
      mockCurrentUser.mockResolvedValue({
        emailAddresses: [{ emailAddress: "new@example.com" }],
        fullName: "新規ユーザー",
        firstName: null,
      });
      // @ts-ignore
      mockCreate.mockResolvedValue({ id: "new-uuid", name: "新規ユーザー", role: "member" });

      const result = await getSession();
      expect(result).toEqual({
        user: { id: "new-uuid", name: "新規ユーザー", role: "member" },
      });
      expect(mockCreate).toHaveBeenCalledWith({
        data: { clerk_id: "clerk_new123", email: "new@example.com", name: "新規ユーザー", role: "member" },
        select: { id: true, name: true, role: true },
      });
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it("既に別の clerk_id に紐付き済みのDBユーザーはnullを返す", async () => {
      // @ts-ignore
      mockAuth.mockResolvedValue({ userId: "clerk_new123" });
      // @ts-ignore
      mockFindUnique
        .mockResolvedValueOnce(null) // clerk_id 検索 → 未ヒット
        // @ts-ignore
        .mockResolvedValueOnce({ id: "user-uuid", name: "田中太郎", role: "member", clerk_id: "clerk_other" }); // email 検索 → 別IDに紐付き済み
      // @ts-ignore
      mockCurrentUser.mockResolvedValue({
        emailAddresses: [{ emailAddress: "tanaka@example.com" }],
      });

      const result = await getSession();
      expect(result).toBeNull();
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it("Clerkのメールアドレスが取得できない場合はnullを返す", async () => {
      // @ts-ignore
      mockAuth.mockResolvedValue({ userId: "clerk_new123" });
      // @ts-ignore
      mockFindUnique.mockResolvedValueOnce(null);
      // @ts-ignore
      mockCurrentUser.mockResolvedValue({ emailAddresses: [] });

      const result = await getSession();
      expect(result).toBeNull();
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });
  });
});
