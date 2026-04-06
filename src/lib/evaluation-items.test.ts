// @vitest-environment node
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError, ConflictError, NotFoundError } from "./errors";
import {
  createEvaluationItem,
  deleteEvaluationItem,
  getEvaluationItems,
  updateEvaluationItem,
} from "./evaluation-items";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    target: { findUnique: vi.fn() },
    category: { findUnique: vi.fn() },
    evaluationItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    fiscalYearItem: { count: vi.fn() },
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

    await expect(
      createEvaluationItem({ targetId: 99, categoryId: 1, name: "x" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("中分類が存在しない場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    await expect(
      createEvaluationItem({ targetId: 1, categoryId: 99, name: "x" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("name が空の場合は BadRequestError をスロー", async () => {
    await expect(
      createEvaluationItem({ targetId: 1, categoryId: 1, name: "  " }),
    ).rejects.toThrow(BadRequestError);
  });

  it("categoryId が targetId と一致しない場合は BadRequestError をスロー", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue({
      ...mockCategory,
      targetId: 2,
    } as never);

    await expect(
      createEvaluationItem({ targetId: 1, categoryId: 1, name: "x" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("DB の一意制約違反（P2002）の場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTarget as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as never);
    vi.mocked(prisma.evaluationItem.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.evaluationItem.create).mockRejectedValue(
      Object.assign(new Prisma.PrismaClientKnownRequestError("Unique constraint", { code: "P2002", clientVersion: "5" }), {}),
    );

    await expect(
      createEvaluationItem({ targetId: 1, categoryId: 1, name: "dup" }),
    ).rejects.toThrow(ConflictError);
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
});

describe("deleteEvaluationItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("評価項目を削除する", async () => {
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.fiscalYearItem.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluationItem.delete).mockResolvedValue(mockItem as never);

    await expect(deleteEvaluationItem(1)).resolves.not.toThrow();
    expect(prisma.evaluationItem.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("存在しない id の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(null);

    await expect(deleteEvaluationItem(99)).rejects.toThrow(NotFoundError);
  });

  it("年度に紐づく項目が存在する場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.fiscalYearItem.count).mockResolvedValue(2);

    await expect(deleteEvaluationItem(1)).rejects.toThrow(ConflictError);
  });
});
