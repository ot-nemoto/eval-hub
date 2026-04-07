// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { deleteUser, getUsers, updateUser } from "./users";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    evaluationAssignment: { count: vi.fn() },
    evaluation: { count: vi.fn() },
    evaluationSetting: { count: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockUser = {
  id: "user-1",
  name: "テストユーザー",
  email: "test@example.com",
  role: "MEMBER",
  division: "開発部",
  joinedAt: new Date("2024-04-01"),
  createdAt: new Date("2024-04-01"),
  isActive: true,
};

describe("getUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ユーザー一覧を name 昇順で返す", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as never);

    const result = await getUsers();

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: "asc" } }),
    );
    expect(result).toEqual([mockUser]);
  });
});

describe("updateUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ユーザーを更新して返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, role: "ADMIN" } as never);

    const result = await updateUser("user-1", { role: "ADMIN" }, "current-user");

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" }, data: { role: "ADMIN" } }),
    );
    expect(result).toMatchObject({ role: "ADMIN" });
  });

  it("自分自身を更新しようとすると ForbiddenError をスロー", async () => {
    await expect(updateUser("user-1", { role: "ADMIN" }, "user-1")).rejects.toThrow(ForbiddenError);
  });

  it("role も isActive も指定しない場合は BadRequestError をスロー", async () => {
    await expect(updateUser("user-1", {}, "current-user")).rejects.toThrow(BadRequestError);
  });

  it("role が不正な値の場合は BadRequestError をスロー", async () => {
    await expect(
      updateUser("user-1", { role: "INVALID" as "ADMIN" }, "current-user"),
    ).rejects.toThrow(BadRequestError);
  });

  it("存在しない id の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(updateUser("unknown", { role: "ADMIN" }, "current-user")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("isActive を更新できる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, isActive: false } as never);

    const result = await updateUser("user-1", { isActive: false }, "current-user");

    expect(result).toMatchObject({ isActive: false });
  });
});

describe("deleteUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ユーザーを削除する", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.evaluationAssignment.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluationSetting.count).mockResolvedValue(0);

    await deleteUser("user-1", "current-user");

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });

  it("自分自身を削除しようとすると ForbiddenError をスロー", async () => {
    await expect(deleteUser("user-1", "user-1")).rejects.toThrow(ForbiddenError);
  });

  it("存在しない id の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(deleteUser("unknown", "current-user")).rejects.toThrow(NotFoundError);
  });

  it("評価データが存在する場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.evaluationAssignment.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(1);
    vi.mocked(prisma.evaluationSetting.count).mockResolvedValue(0);

    await expect(deleteUser("user-1", "current-user")).rejects.toThrow(ConflictError);
  });

  it("アサインデータが存在する場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.evaluationAssignment.count).mockResolvedValue(1);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluationSetting.count).mockResolvedValue(0);

    await expect(deleteUser("user-1", "current-user")).rejects.toThrow(ConflictError);
  });
});
