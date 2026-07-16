// @vitest-environment node
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError, ConflictError, NotFoundError } from "./errors";
import {
  bulkReplaceEvaluationItems,
  createEvaluationItem,
  deleteEvaluationItem,
  getEvaluationItems,
  reorderEvaluationItems,
  updateEvaluationItem,
} from "./evaluation-items";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    target: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    category: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    evaluationItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    evalItemVersionDetail: { count: vi.fn() },
    $transaction: vi.fn((cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        target: {
          create: vi.mocked(prisma.target.create),
          deleteMany: vi.mocked(prisma.target.deleteMany),
        },
        category: {
          create: vi.mocked(prisma.category.create),
          deleteMany: vi.mocked(prisma.category.deleteMany),
        },
        evaluationItem: {
          update: vi.mocked(prisma.evaluationItem.update),
          createMany: vi.mocked(prisma.evaluationItem.createMany),
          deleteMany: vi.mocked(prisma.evaluationItem.deleteMany),
        },
      }),
    ),
  },
}));

import { prisma } from "@/lib/prisma";

const mockTarget = { id: 1, name: "employee", no: 1 };
const mockCategory = { id: 1, targetId: 1, name: "engagement", no: 1 };
const mockItem = {
  id: 1,
  targetId: 1,
  categoryId: 1,
  no: 1,
  name: "item A",
  description: null,
  evalCriteria: null,
  target: { id: 1, name: "employee", no: 1 },
  category: { id: 1, targetId: 1, name: "engagement", no: 1 },
};

describe("getEvaluationItems", () => {
  beforeEach(() => vi.clearAllMocks());

  it("フィルタなしで全件取得できる", async () => {
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue([mockItem] as never);

    const result = await getEvaluationItems();

    expect(prisma.evaluationItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
    expect(result).toHaveLength(1);
  });

  it("targetId でフィルタできる", async () => {
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue([mockItem] as never);

    await getEvaluationItems({ targetId: 1 });

    expect(prisma.evaluationItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { targetId: 1 } }),
    );
  });

  it("categoryId でフィルタできる", async () => {
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue([mockItem] as never);

    await getEvaluationItems({ categoryId: 1 });

    expect(prisma.evaluationItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { categoryId: 1 } }),
    );
  });

  it("targetId に 0 以下を渡すと BadRequestError をスロー", async () => {
    await expect(getEvaluationItems({ targetId: 0 })).rejects.toThrow(BadRequestError);
  });

  it("categoryId に 0 以下を渡すと BadRequestError をスロー", async () => {
    await expect(getEvaluationItems({ categoryId: -1 })).rejects.toThrow(BadRequestError);
  });
});

describe("createEvaluationItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("評価項目を作成して返す", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as never);
    vi.mocked(prisma.evaluationItem.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.evaluationItem.create).mockResolvedValue(mockItem as never);

    const result = await createEvaluationItem({ targetId: 1, categoryId: 1, name: "item A" });

    expect(result).toEqual(mockItem);
  });

  it("no は既存の最大値 + 1 で採番される", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as never);
    vi.mocked(prisma.evaluationItem.findFirst).mockResolvedValue({ no: 3 } as never);
    vi.mocked(prisma.evaluationItem.create).mockResolvedValue({ ...mockItem, no: 4 } as never);

    await createEvaluationItem({ targetId: 1, categoryId: 1, name: "item B" });

    expect(prisma.evaluationItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ no: 4 }) }),
    );
  });

  it("大分類が存在しない場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(null);

    await expect(createEvaluationItem({ targetId: 99, categoryId: 1, name: "x" })).rejects.toThrow(
      NotFoundError,
    );
  });

  it("中分類が存在しない場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    await expect(createEvaluationItem({ targetId: 1, categoryId: 99, name: "x" })).rejects.toThrow(
      NotFoundError,
    );
  });

  it("name が空の場合は BadRequestError をスロー", async () => {
    await expect(createEvaluationItem({ targetId: 1, categoryId: 1, name: "  " })).rejects.toThrow(
      BadRequestError,
    );
  });

  it("categoryId が targetId と一致しない場合は BadRequestError をスロー", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue({
      ...mockCategory,
      targetId: 2,
    } as never);

    await expect(createEvaluationItem({ targetId: 1, categoryId: 1, name: "x" })).rejects.toThrow(
      BadRequestError,
    );
  });

  it("DB の一意制約違反（P2002）の場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as never);
    vi.mocked(prisma.evaluationItem.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.evaluationItem.create).mockRejectedValue(
      Object.assign(
        new Prisma.PrismaClientKnownRequestError("Unique constraint", {
          code: "P2002",
          clientVersion: "5",
        }),
        {},
      ),
    );

    await expect(createEvaluationItem({ targetId: 1, categoryId: 1, name: "dup" })).rejects.toThrow(
      ConflictError,
    );
  });
});

describe("updateEvaluationItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("評価項目を更新して返す", async () => {
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.evaluationItem.update).mockResolvedValue({
      ...mockItem,
      name: "updated",
    } as never);

    const result = await updateEvaluationItem(1, { name: "updated" });

    expect(result.name).toBe("updated");
  });

  it("存在しない id の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(null);

    await expect(updateEvaluationItem(99, { name: "x" })).rejects.toThrow(NotFoundError);
  });

  it("更新フィールドが空の場合は BadRequestError をスロー", async () => {
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);

    await expect(updateEvaluationItem(1, {})).rejects.toThrow(BadRequestError);
  });

  it("name に空文字を渡すと BadRequestError をスロー", async () => {
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);

    await expect(updateEvaluationItem(1, { name: "  " })).rejects.toThrow(BadRequestError);
  });

  it("no を更新できる", async () => {
    vi.mocked(prisma.evaluationItem.findUnique)
      .mockResolvedValueOnce(mockItem as never)
      .mockResolvedValueOnce(null as never);
    vi.mocked(prisma.evaluationItem.update).mockResolvedValue({
      ...mockItem,
      no: 5,
    } as never);

    const result = await updateEvaluationItem(1, { no: 5 });

    expect(result.no).toBe(5);
    expect(prisma.evaluationItem.findUnique).toHaveBeenCalledWith({
      where: { categoryId_no: { categoryId: 1, no: 5 } },
    });
  });

  it("no が重複する場合は ConflictError をスロー（事前チェック）", async () => {
    vi.mocked(prisma.evaluationItem.findUnique)
      .mockResolvedValueOnce(mockItem as never)
      .mockResolvedValueOnce({ id: 2, categoryId: 1, no: 2 } as never);

    await expect(updateEvaluationItem(1, { no: 2 })).rejects.toThrow(ConflictError);
  });

  it("no 更新時に P2002 が発生した場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.evaluationItem.findUnique)
      .mockResolvedValueOnce(mockItem as never)
      .mockResolvedValueOnce(null as never);
    vi.mocked(prisma.evaluationItem.update).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "5",
      }),
    );

    await expect(updateEvaluationItem(1, { no: 3 })).rejects.toThrow(ConflictError);
  });
});

describe("reorderEvaluationItems", () => {
  beforeEach(() => vi.clearAllMocks());

  it("2ステップで index を更新する", async () => {
    vi.mocked(prisma.evaluationItem.update).mockResolvedValue({} as never);

    await reorderEvaluationItems([
      { id: 1, index: 2 },
      { id: 2, index: 1 },
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.evaluationItem.update).toHaveBeenCalledTimes(4);
    expect(prisma.evaluationItem.update).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: { index: 100002 },
    });
    expect(prisma.evaluationItem.update).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      data: { index: 100001 },
    });
    expect(prisma.evaluationItem.update).toHaveBeenNthCalledWith(3, {
      where: { id: 1 },
      data: { index: 2 },
    });
    expect(prisma.evaluationItem.update).toHaveBeenNthCalledWith(4, {
      where: { id: 2 },
      data: { index: 1 },
    });
  });
});

describe("deleteEvaluationItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("評価項目を削除する", async () => {
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.evaluationItem.delete).mockResolvedValue(mockItem as never);

    await expect(deleteEvaluationItem(1)).resolves.not.toThrow();
    expect(prisma.evaluationItem.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("存在しない id の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(null);

    await expect(deleteEvaluationItem(99)).rejects.toThrow(NotFoundError);
  });
});

describe("bulkReplaceEvaluationItems", () => {
  beforeEach(() => vi.clearAllMocks());

  const validTree = [
    {
      no: 1,
      name: "社員",
      categories: [
        {
          no: 1,
          name: "エンゲージメント",
          items: [
            { no: 1, name: "item A", description: null, evalCriteria: null },
            { no: 2, name: "item B" },
          ],
        },
      ],
    },
  ];

  it("全削除→INSERT を実行し作成件数を返す", async () => {
    vi.mocked(prisma.target.create).mockResolvedValue({ id: 1, no: 1, name: "社員" } as never);
    vi.mocked(prisma.category.create).mockResolvedValue({
      id: 1,
      targetId: 1,
      no: 1,
      name: "エンゲージメント",
    } as never);
    vi.mocked(prisma.evaluationItem.createMany).mockResolvedValue({ count: 2 } as never);

    const result = await bulkReplaceEvaluationItems(validTree);

    expect(result).toEqual({ created: 2 });
    expect(prisma.evaluationItem.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.category.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.target.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.target.create).toHaveBeenCalledTimes(1);
    expect(prisma.category.create).toHaveBeenCalledTimes(1);
    expect(prisma.evaluationItem.createMany).toHaveBeenCalledTimes(1);
  });

  it("index は送信順に採番される", async () => {
    vi.mocked(prisma.target.create).mockResolvedValue({ id: 1, no: 1, name: "社員" } as never);
    vi.mocked(prisma.category.create).mockResolvedValue({ id: 1, no: 1, name: "C" } as never);
    vi.mocked(prisma.evaluationItem.createMany).mockResolvedValue({ count: 2 } as never);

    await bulkReplaceEvaluationItems(validTree);

    expect(prisma.target.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ index: 1 }) }),
    );
    const [createManyArg] = vi.mocked(prisma.evaluationItem.createMany).mock.calls[0] ?? [];
    expect(createManyArg?.data).toEqual([
      expect.objectContaining({ no: 1, index: 1 }),
      expect.objectContaining({ no: 2, index: 2 }),
    ]);
  });

  it("大項目の no が 0 以下の場合は BadRequestError をスロー", async () => {
    await expect(
      bulkReplaceEvaluationItems([{ no: 0, name: "T", categories: [] }]),
    ).rejects.toThrow(BadRequestError);
  });

  it("評価項目の name が空の場合は BadRequestError をスロー", async () => {
    await expect(
      bulkReplaceEvaluationItems([
        { no: 1, name: "T", categories: [{ no: 1, name: "C", items: [{ no: 1, name: "  " }] }] },
      ]),
    ).rejects.toThrow(BadRequestError);
  });

  it("no 重複（P2002）は ConflictError をスロー", async () => {
    vi.mocked(prisma.target.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "5",
      }),
    );

    await expect(bulkReplaceEvaluationItems(validTree)).rejects.toThrow(ConflictError);
  });
});
