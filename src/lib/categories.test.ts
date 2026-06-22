// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCategory,
  deleteCategory,
  getCategories,
  reorderCategories,
  updateCategory,
} from "./categories";
import { ConflictError, NotFoundError } from "./errors";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    target: { findUnique: vi.fn() },
    category: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    evaluationItem: { count: vi.fn() },
    $transaction: vi.fn((cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        category: { update: vi.mocked(prisma.category.update) },
      }),
    ),
  },
}));

import { prisma } from "@/lib/prisma";

const mockTarget = { id: 1, name: "employee", no: 1 };
const mockCategories = [
  { id: 1, targetId: 1, name: "category A", no: 1 },
  { id: 2, targetId: 1, name: "category B", no: 2 },
];

describe("getCategories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("全中分類を no 昇順で返す", async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue(mockCategories as never);

    const result = await getCategories();

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { index: "asc" },
      select: { id: true, targetId: true, name: true, no: true, index: true },
    });
    expect(result).toHaveLength(2);
  });

  it("targetId を指定してフィルタリングできる", async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue(mockCategories as never);

    await getCategories(1);

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { targetId: 1 },
      orderBy: { index: "asc" },
      select: { id: true, targetId: true, name: true, no: true, index: true },
    });
  });
});

describe("createCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no と index を自動採番して中分類を作成する", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findFirst)
      .mockResolvedValueOnce({ no: 2 } as never)
      .mockResolvedValueOnce({ index: 2 } as never);
    vi.mocked(prisma.category.create).mockResolvedValue({
      id: 3,
      targetId: 1,
      name: "new",
      no: 3,
      index: 3,
    } as never);

    const result = await createCategory({ targetId: 1, name: "new" });

    expect(prisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { targetId: 1, name: "new", no: 3, index: 3 } }),
    );
    expect(result).toEqual({ id: 3, targetId: 1, name: "new", no: 3, index: 3 });
  });

  it("中分類が存在しない場合は no=1, index=1 で作成する", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.category.create).mockResolvedValue({
      id: 1,
      targetId: 1,
      name: "first",
      no: 1,
      index: 1,
    } as never);

    await createCategory({ targetId: 1, name: "first" });

    expect(prisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { targetId: 1, name: "first", no: 1, index: 1 } }),
    );
  });

  it("大分類が存在しない場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(null);

    await expect(createCategory({ targetId: 99, name: "x" })).rejects.toThrow(NotFoundError);
  });
});

describe("updateCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("中分類を更新して返す", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategories[0] as never);
    vi.mocked(prisma.category.update).mockResolvedValue({
      id: 1,
      targetId: 1,
      name: "updated",
      no: 1,
    } as never);

    const result = await updateCategory(1, { name: "updated" });

    expect(result).toEqual({ id: 1, targetId: 1, name: "updated", no: 1 });
  });

  it("存在しない id の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    await expect(updateCategory(99, { name: "x" })).rejects.toThrow(NotFoundError);
  });

  it("no を変更する際に重複がある場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.category.findUnique)
      .mockResolvedValueOnce(mockCategories[0] as never) // category exists
      .mockResolvedValueOnce(mockCategories[1] as never); // conflicting category exists

    await expect(updateCategory(1, { no: 2 })).rejects.toThrow(ConflictError);
  });

  it("no を変更しない場合は重複チェックをスキップ", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategories[0] as never);
    vi.mocked(prisma.category.update).mockResolvedValue({
      id: 1,
      targetId: 1,
      name: "renamed",
      no: 1,
    } as never);

    await expect(updateCategory(1, { name: "renamed" })).resolves.not.toThrow();
    expect(prisma.category.findUnique).toHaveBeenCalledTimes(1);
  });
});

describe("reorderCategories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("2ステップで index を更新する", async () => {
    vi.mocked(prisma.category.update).mockResolvedValue({} as never);

    await reorderCategories([
      { id: 1, index: 2 },
      { id: 2, index: 1 },
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.category.update).toHaveBeenCalledTimes(4);
    expect(prisma.category.update).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: { index: 100002 },
    });
    expect(prisma.category.update).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      data: { index: 100001 },
    });
    expect(prisma.category.update).toHaveBeenNthCalledWith(3, {
      where: { id: 1 },
      data: { index: 2 },
    });
    expect(prisma.category.update).toHaveBeenNthCalledWith(4, {
      where: { id: 2 },
      data: { index: 1 },
    });
  });
});

describe("deleteCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("中分類を削除する", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategories[0] as never);
    vi.mocked(prisma.evaluationItem.count).mockResolvedValue(0);
    vi.mocked(prisma.category.delete).mockResolvedValue(mockCategories[0] as never);

    await expect(deleteCategory(1)).resolves.not.toThrow();
    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("存在しない id の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    await expect(deleteCategory(99)).rejects.toThrow(NotFoundError);
  });

  it("紐づく評価項目が存在する場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategories[0] as never);
    vi.mocked(prisma.evaluationItem.count).mockResolvedValue(3);

    await expect(deleteCategory(1)).rejects.toThrow(ConflictError);
  });
});
