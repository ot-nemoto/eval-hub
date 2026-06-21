// @vitest-environment node
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError, ConflictError, NotFoundError } from "./errors";
import {
  assertFiscalYearUnlocked,
  createFiscalYear,
  deleteFiscalYear,
  getFiscalYears,
  toggleFiscalYearLock,
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
    evaluationAssignment: { count: vi.fn() },
    evaluation: { count: vi.fn() },
    evaluationSetting: { count: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
      fn({
        fiscalYear: {
          create: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn(),
        },
      }),
    ),
  },
}));

import { prisma } from "@/lib/prisma";

const mockFy = {
  year: 2024,
  name: "2024年度",
  startDate: new Date("2024-04-01"),
  endDate: new Date("2025-03-31"),
  isCurrent: true,
  isLocked: false,
  evalItemVersionId: null,
};

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
    vi.mocked(prisma.fiscalYear.create).mockResolvedValue(mockFy as never);

    const result = await createFiscalYear({
      year: 2024,
      name: "2024年度",
      startDate: "2024-04-01",
      endDate: "2025-03-31",
    });

    expect(result).toEqual(mockFy);
  });

  it("直近年度のバージョンを引き継ぐ", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.fiscalYear.findFirst).mockResolvedValue({
      year: 2023,
      evalItemVersionId: 5,
    } as never);
    vi.mocked(prisma.fiscalYear.create).mockResolvedValue(mockFy as never);

    await createFiscalYear({
      year: 2024,
      name: "2024年度",
      startDate: "2024-04-01",
      endDate: "2025-03-31",
    });

    expect(prisma.fiscalYear.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ evalItemVersionId: 5 }),
      }),
    );
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
    vi.mocked(prisma.fiscalYear.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "5",
      }),
    );

    await expect(
      createFiscalYear({ year: 2024, name: "x", startDate: "2024-01-01", endDate: "2024-12-31" }),
    ).rejects.toThrow(ConflictError);
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

    await expect(updateFiscalYear(2024, { startDate: "2030-01-01" })).rejects.toThrow(
      BadRequestError,
    );
  });
});

describe("deleteFiscalYear", () => {
  beforeEach(() => vi.clearAllMocks());

  it("年度を削除する", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.evaluationAssignment.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(0);
    vi.mocked(prisma.evaluationSetting.count).mockResolvedValue(0);

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

    await expect(deleteFiscalYear(2024)).rejects.toThrow(ConflictError);
  });
});

describe("toggleFiscalYearLock", () => {
  beforeEach(() => vi.clearAllMocks());

  it("年度をロックする", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(mockFy as never);
    vi.mocked(prisma.fiscalYear.update).mockResolvedValue({ ...mockFy, isLocked: true } as never);

    const result = await toggleFiscalYearLock(2024, true);

    expect(prisma.fiscalYear.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { year: 2024 }, data: { isLocked: true } }),
    );
    expect(result.isLocked).toBe(true);
  });

  it("年度のロックを解除する", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue({
      ...mockFy,
      isLocked: true,
    } as never);
    vi.mocked(prisma.fiscalYear.update).mockResolvedValue({ ...mockFy, isLocked: false } as never);

    const result = await toggleFiscalYearLock(2024, false);

    expect(prisma.fiscalYear.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { year: 2024 }, data: { isLocked: false } }),
    );
    expect(result.isLocked).toBe(false);
  });

  it("存在しない年度の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);

    await expect(toggleFiscalYearLock(9999, true)).rejects.toThrow(NotFoundError);
  });
});

describe("assertFiscalYearUnlocked", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ロックされていない場合は null を返す", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue({ isLocked: false } as never);

    const result = await assertFiscalYearUnlocked(2024);

    expect(result).toBeNull();
  });

  it("ロックされている場合はエラーオブジェクトを返す", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue({ isLocked: true } as never);

    const result = await assertFiscalYearUnlocked(2024);

    expect(result).toEqual({ error: "この年度はロックされているため編集できません" });
  });
});
