// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
const mockUpdate = vi.mocked(prisma.user.update);
const mockCreate = vi.mocked(prisma.user.create);

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
        .mockResolvedValueOnce({ id: "user-uuid", name: "田中太郎", role: "member", clerk_id: null }); // email 検索
      // @ts-ignore
      mockCurrentUser.mockResolvedValue({
        emailAddresses: [{ emailAddress: "tanaka@example.com" }],
      });
      // @ts-ignore
      mockUpdate.mockResolvedValue({ id: "user-uuid", name: "田中太郎", role: "member" });

      const result = await getSession();
      expect(result).toEqual({
        user: { id: "user-uuid", name: "田中太郎", role: "member" },
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { email: "tanaka@example.com" },
        data: { clerk_id: "clerk_new123" },
        select: { id: true, name: true, role: true },
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
      expect(mockUpdate).not.toHaveBeenCalled();
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
      expect(mockUpdate).not.toHaveBeenCalled();
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
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
