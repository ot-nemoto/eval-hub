// @vitest-environment node
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError, ConflictError, NotFoundError } from "./errors";
import {
  addFiscalYearItem,
  createFiscalYear,
  deleteFiscalYear,
  getFiscalYearItems,
  getFiscalYears,
  removeFiscalYearItem,
  updateFiscalYear,
} from "./fiscal-years";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fiscalYear: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    fiscalYearItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    evaluationItem: {
      findUnique: vi.fn(),
    },
    evaluationAssignment: { count: vi.fn() },
    evaluation: { count: vi.fn() },
    evaluationSetting: { count: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({
      fiscalYear: {
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      fiscalYearItem: {
        findMany: vi.fn(),
        createMany: vi.fn(),
      },
    })),
  },
}));

import { prisma } from "@/lib/prisma";

const mockFy = {
  year: 2024,
  name: "2024年度",
  startDate: new Date("2024-04-01"),
  endDate: new Date("2025-03-31"),
  isCurrent: true,
};

const mockItem = { id: 1, targetId: 1, categoryId: 1, no: 1, name: "項目A" };

describe("getFiscalYears", () => {
  beforeEach(() => vi.clearAllMocks());

  it("年度一覧を year 降順で返す", async () => {
    vi.mocked(prisma.fiscalYear.findMany).mockResolvedValue([mockFy] as never);

    const result = await getFiscalYears();

    expect(prisma.fiscalYear.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { year: "desc" } }),
    );
    expect(result).toEqual([mockFy]);
  });
});

describe("createFiscalYear", () => {
  beforeEach(() => vi.clearAllMocks());

  it("年度を作成して返す", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.fiscalYear.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        fiscalYear: { create: vi.fn().mockResolvedValue(mockFy), updateMany: vi.fn(), update: vi.fn() },
        fiscalYearItem: { findMany: vi.fn().mockResolvedValue([]), createMany: vi.fn() },
      };
      return fn(tx);
    });

    const result = await createFiscalYear({
      year: 2024,
      name: "2024年度",
      startDate: "2024-04-01",
      endDate: "2025-03-31",
    });

    expect(result).toEqual(mockFy);
  });

  it("year が範囲外の場合は BadRequestError をスロー", async () => {
    await expect(
      createFiscalYear({ year: 1800, name: "x", startDate: "2024-01-01", endDate: "2024-12-31" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("name が空の場合は BadRequestError をスロー", async () => {
    await expect(
      createFiscalYear({ year: 2024, name: "  ", startDate: "2024-01-01", endDate: "2024-12-31" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("startDate が不正な場合は BadRequestError をスロー", async () => {
    await expect(
      createFiscalYear({ year: 2024, name: "x", startDate: "invalid", endDate: "2024-12-31" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("startDate > endDate の場合は BadRequestError をスロー", async () => {
    await expect(
      createFiscalYear({ year: 2024, name: "x", startDate: "2024-12-31", endDate: "2024-01-01" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("同じ year が存在する場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);

    await expect(
      createFiscalYear({ year: 2024, name: "x", startDate: "2024-01-01", endDate: "2024-12-31" }),
    ).rejects.toThrow(ConflictError);
  });

  it("DB の P2002（同時実行競合）の場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.fiscalYear.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", { code: "P2002", clientVersion: "5" }),
    );

    await expect(
      createFiscalYear({ year: 2024, name: "x", startDate: "2024-01-01", endDate: "2024-12-31" }),
    ).rejects.toThrow(ConflictError);
  });

  it("直近年度の評価項目をコピーする", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.fiscalYear.findFirst).mockResolvedValue({ year: 2023 } as never);
    const mockCreateMany = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        fiscalYear: { create: vi.fn().mockResolvedValue(mockFy), updateMany: vi.fn(), update: vi.fn() },
        fiscalYearItem: {
          findMany: vi.fn().mockResolvedValue([{ evaluationItemId: 1 }]),
          createMany: mockCreateMany,
        },
      };
      return fn(tx);
    });

    await createFiscalYear({
      year: 2024,
      name: "2024年度",
      startDate: "2024-04-01",
      endDate: "2025-03-31",
    });

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [{ fiscalYear: 2024, evaluationItemId: 1 }],
    });
  });
});

describe("updateFiscalYear", () => {
  beforeEach(() => vi.clearAllMocks());

  it("年度を更新して返す", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        fiscalYear: {
          create: vi.fn(),
          updateMany: vi.fn(),
          update: vi.fn().mockResolvedValue({ ...mockFy, name: "更新後" }),
        },
        fiscalYearItem: { findMany: vi.fn(), createMany: vi.fn() },
      };
      return fn(tx);
    });

    const result = await updateFiscalYear(2024, { name: "更新後" });

    expect(result).toMatchObject({ name: "更新後" });
  });

  it("更新フィールドが空の場合は BadRequestError をスロー", async () => {
    await expect(updateFiscalYear(2024, {})).rejects.toThrow(BadRequestError);
  });

  it("存在しない year の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);

    await expect(updateFiscalYear(9999, { name: "x" })).rejects.toThrow(NotFoundError);
  });

  it("name が空の場合は BadRequestError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);

    await expect(updateFiscalYear(2024, { name: "  " })).rejects.toThrow(BadRequestError);
  });

  it("startDate が不正な場合は BadRequestError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);

    await expect(updateFiscalYear(2024, { startDate: "invalid" })).rejects.toThrow(BadRequestError);
  });

  it("startDate > endDate の場合は BadRequestError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);

    await expect(
      updateFiscalYear(2024, { startDate: "2030-01-01" }),
    ).rejects.toThrow(BadRequestError);
  });
});

describe("deleteFiscalYear", () => {
  beforeEach(() => vi.clearAllMocks());

  it("年度を削除する", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.evaluationAssignment.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluationSetting.count).mockResolvedValue(0);
    vi.mocked(prisma.fiscalYearItem.count).mockResolvedValue(0);

    await deleteFiscalYear(2024);

    expect(prisma.fiscalYear.delete).toHaveBeenCalledWith({ where: { year: 2024 } });
  });

  it("存在しない year の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);

    await expect(deleteFiscalYear(9999)).rejects.toThrow(NotFoundError);
  });

  it("紐づくデータが存在する場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.evaluationAssignment.count).mockResolvedValue(1);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluationSetting.count).mockResolvedValue(0);
    vi.mocked(prisma.fiscalYearItem.count).mockResolvedValue(0);

    await expect(deleteFiscalYear(2024)).rejects.toThrow(ConflictError);
  });
});

describe("getFiscalYearItems", () => {
  beforeEach(() => vi.clearAllMocks());

  it("年度の評価項目一覧を返す", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.fiscalYearItem.findMany).mockResolvedValue([
      { evaluationItem: mockItem },
    ] as never);

    const result = await getFiscalYearItems(2024);

    expect(result).toEqual([mockItem]);
  });

  it("存在しない year の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);

    await expect(getFiscalYearItems(9999)).rejects.toThrow(NotFoundError);
  });
});

describe("addFiscalYearItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("評価項目を年度に追加して返す", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.fiscalYearItem.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.fiscalYearItem.create).mockResolvedValue({
      fiscalYear: 2024,
      evaluationItemId: 1,
    } as never);

    const result = await addFiscalYearItem(2024, 1);

    expect(result).toEqual({ fiscalYear: 2024, evaluationItemId: 1 });
  });

  it("itemId が 0 以下の場合は BadRequestError をスロー", async () => {
    await expect(addFiscalYearItem(2024, 0)).rejects.toThrow(BadRequestError);
  });

  it("存在しない year の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);

    await expect(addFiscalYearItem(9999, 1)).rejects.toThrow(NotFoundError);
  });

  it("評価項目が存在しない場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(null);

    await expect(addFiscalYearItem(2024, 99)).rejects.toThrow(NotFoundError);
  });

  it("既に紐づいている場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.fiscalYearItem.findUnique).mockResolvedValue({
      fiscalYear: 2024,
      evaluationItemId: 1,
    } as never);

    await expect(addFiscalYearItem(2024, 1)).rejects.toThrow(ConflictError);
  });

  it("DB の P2002（同時実行競合）の場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.evaluationItem.findUnique).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.fiscalYearItem.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.fiscalYearItem.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", { code: "P2002", clientVersion: "5" }),
    );

    await expect(addFiscalYearItem(2024, 1)).rejects.toThrow(ConflictError);
  });
});

describe("removeFiscalYearItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("評価項目を年度から削除する", async () => {
    vi.mocked(prisma.fiscalYearItem.findUnique).mockResolvedValue({
      fiscalYear: 2024,
      evaluationItemId: 1,
    } as never);

    await removeFiscalYearItem(2024, 1);

    expect(prisma.fiscalYearItem.delete).toHaveBeenCalled();
  });

  it("itemId が 0 以下の場合は BadRequestError をスロー", async () => {
    await expect(removeFiscalYearItem(2024, 0)).rejects.toThrow(BadRequestError);
  });

  it("紐づきが存在しない場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.fiscalYearItem.findUnique).mockResolvedValue(null);

    await expect(removeFiscalYearItem(2024, 99)).rejects.toThrow(NotFoundError);
  });
});
