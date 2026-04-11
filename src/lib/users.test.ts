// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { deleteUser, getUsers, updateUserName, updateUser } from "./users";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
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

  it("isActive が boolean 以外の場合は BadRequestError をスロー", async () => {
    await expect(
      updateUser("user-1", { isActive: "false" as unknown as boolean }, "current-user"),
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

describe("updateUserName", () => {
  beforeEach(() => vi.clearAllMocks());

  it("名前を更新して返す", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "user-1", name: "新しい名前" } as never);

    const result = await updateUserName("user-1", "新しい名前");

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" }, data: { name: "新しい名前" } }),
    );
    expect(result).toMatchObject({ name: "新しい名前" });
  });

  it("前後の空白をトリムして更新する", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "user-1", name: "トリム名" } as never);

    await updateUserName("user-1", "  トリム名  ");

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "トリム名" } }),
    );
  });

  it("空文字の場合は BadRequestError をスロー", async () => {
    await expect(updateUserName("user-1", "")).rejects.toThrow(BadRequestError);
  });

  it("空白のみの場合は BadRequestError をスロー", async () => {
    await expect(updateUserName("user-1", "   ")).rejects.toThrow(BadRequestError);
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

  it("評価設定データが存在する場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.evaluationAssignment.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluationSetting.count).mockResolvedValue(1);

    await expect(deleteUser("user-1", "current-user")).rejects.toThrow(ConflictError);
  });
});
