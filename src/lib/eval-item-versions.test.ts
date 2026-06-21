// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError, ConflictError, NotFoundError } from "./errors";
import {
  assignVersionToFiscalYear,
  createEvalItemVersion,
  deleteEvalItemVersion,
  getEvalItemVersionDetails,
  getEvalItemVersions,
  restoreEvalItemVersion,
  unassignVersionFromFiscalYear,
} from "./eval-item-versions";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    evalItemVersion: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    evalItemVersionDetail: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    evaluationItem: { findMany: vi.fn() },
    fiscalYear: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";

describe("getEvalItemVersions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("バージョン一覧を id desc で返す", async () => {
    vi.mocked(prisma.evalItemVersion.findMany).mockResolvedValue([] as never);
    await getEvalItemVersions();
    expect(prisma.evalItemVersion.findMany).toHaveBeenCalledWith({
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { details: true, fiscalYears: true } },
      },
    });
  });
});

describe("getEvalItemVersionDetails", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在しないバージョンで NotFoundError", async () => {
    vi.mocked(prisma.evalItemVersion.findUnique).mockResolvedValue(null);
    await expect(getEvalItemVersionDetails(999)).rejects.toThrow(NotFoundError);
  });

  it("バージョン詳細を返す", async () => {
    vi.mocked(prisma.evalItemVersion.findUnique).mockResolvedValue({ id: 1 } as never);
    vi.mocked(prisma.evalItemVersionDetail.findMany).mockResolvedValue([] as never);
    await getEvalItemVersionDetails(1);
    expect(prisma.evalItemVersionDetail.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { versionId: 1 } }),
    );
  });
});

describe("createEvalItemVersion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("空文字で BadRequestError", async () => {
    await expect(createEvalItemVersion("  ")).rejects.toThrow(BadRequestError);
  });

  it("評価項目が0件で BadRequestError", async () => {
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue([]);
    await expect(createEvalItemVersion("v1")).rejects.toThrow(BadRequestError);
  });

  it("正常系でバージョンを作成する", async () => {
    const mockItems = [
      {
        id: 1,
        targetId: 1,
        categoryId: 1,
        no: 1,
        name: "項目1",
        description: null,
        evalCriteria: null,
        target: { no: 1, name: "大分類1" },
        category: { no: 1, name: "中分類1" },
      },
    ];
    vi.mocked(prisma.evaluationItem.findMany).mockResolvedValue(mockItems as never);
    vi.mocked(prisma.evalItemVersion.create).mockResolvedValue({
      id: 1,
      name: "v1",
      createdAt: new Date(),
    } as never);

    await createEvalItemVersion("v1");
    expect(prisma.evalItemVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "v1" }),
      }),
    );
  });
});

describe("restoreEvalItemVersion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在しないバージョンで NotFoundError", async () => {
    vi.mocked(prisma.evalItemVersion.findUnique).mockResolvedValue(null);
    await expect(restoreEvalItemVersion(999)).rejects.toThrow(NotFoundError);
  });

  it("詳細が空で BadRequestError", async () => {
    vi.mocked(prisma.evalItemVersion.findUnique).mockResolvedValue({
      id: 1,
      details: [],
    } as never);
    await expect(restoreEvalItemVersion(1)).rejects.toThrow(BadRequestError);
  });

  it("正常系でトランザクションを実行する", async () => {
    vi.mocked(prisma.evalItemVersion.findUnique).mockResolvedValue({
      id: 1,
      details: [
        {
          evaluationItemId: 1,
          targetId: 1,
          categoryId: 1,
          no: 1,
          name: "項目1",
          description: null,
          evalCriteria: null,
          targetNo: 1,
          targetName: "大分類1",
          categoryNo: 1,
          categoryName: "中分類1",
        },
      ],
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never);

    await restoreEvalItemVersion(1);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe("deleteEvalItemVersion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在しないバージョンで NotFoundError", async () => {
    vi.mocked(prisma.evalItemVersion.findUnique).mockResolvedValue(null);
    await expect(deleteEvalItemVersion(999)).rejects.toThrow(NotFoundError);
  });

  it("年度に割り当て中で ConflictError", async () => {
    vi.mocked(prisma.evalItemVersion.findUnique).mockResolvedValue({
      id: 1,
      _count: { fiscalYears: 1 },
    } as never);
    await expect(deleteEvalItemVersion(1)).rejects.toThrow(ConflictError);
  });

  it("正常系で削除する", async () => {
    vi.mocked(prisma.evalItemVersion.findUnique).mockResolvedValue({
      id: 1,
      _count: { fiscalYears: 0 },
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never);

    await deleteEvalItemVersion(1);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe("assignVersionToFiscalYear", () => {
  beforeEach(() => vi.clearAllMocks());

  it("不正な year で BadRequestError", async () => {
    await expect(assignVersionToFiscalYear(0, 1)).rejects.toThrow(BadRequestError);
  });

  it("不正な versionId で BadRequestError", async () => {
    await expect(assignVersionToFiscalYear(2026, -1)).rejects.toThrow(BadRequestError);
  });

  it("年度が存在しない場合 NotFoundError", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);
    await expect(assignVersionToFiscalYear(2026, 1)).rejects.toThrow(NotFoundError);
  });

  it("ロック中の年度で ConflictError", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue({
      year: 2026,
      isLocked: true,
    } as never);
    await expect(assignVersionToFiscalYear(2026, 1)).rejects.toThrow(ConflictError);
  });

  it("バージョンが存在しない場合 NotFoundError", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue({
      year: 2026,
      isLocked: false,
    } as never);
    vi.mocked(prisma.evalItemVersion.findUnique).mockResolvedValue(null);
    await expect(assignVersionToFiscalYear(2026, 1)).rejects.toThrow(NotFoundError);
  });

  it("正常系で割り当てる", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue({
      year: 2026,
      isLocked: false,
    } as never);
    vi.mocked(prisma.evalItemVersion.findUnique).mockResolvedValue({ id: 1 } as never);
    vi.mocked(prisma.fiscalYear.update).mockResolvedValue({
      year: 2026,
      evalItemVersionId: 1,
    } as never);

    const result = await assignVersionToFiscalYear(2026, 1);
    expect(prisma.fiscalYear.update).toHaveBeenCalledWith({
      where: { year: 2026 },
      data: { evalItemVersionId: 1 },
      select: { year: true, evalItemVersionId: true },
    });
    expect(result).toEqual({ year: 2026, evalItemVersionId: 1 });
  });
});

describe("unassignVersionFromFiscalYear", () => {
  beforeEach(() => vi.clearAllMocks());

  it("不正な year で BadRequestError", async () => {
    await expect(unassignVersionFromFiscalYear(0)).rejects.toThrow(BadRequestError);
  });

  it("年度が存在しない場合 NotFoundError", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);
    await expect(unassignVersionFromFiscalYear(2026)).rejects.toThrow(NotFoundError);
  });

  it("ロック中の年度で ConflictError", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue({
      year: 2026,
      isLocked: true,
    } as never);
    await expect(unassignVersionFromFiscalYear(2026)).rejects.toThrow(ConflictError);
  });

  it("正常系で割り当て解除する", async () => {
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue({
      year: 2026,
      isLocked: false,
    } as never);
    vi.mocked(prisma.fiscalYear.update).mockResolvedValue({
      year: 2026,
      evalItemVersionId: null,
    } as never);

    const result = await unassignVersionFromFiscalYear(2026);
    expect(prisma.fiscalYear.update).toHaveBeenCalledWith({
      where: { year: 2026 },
      data: { evalItemVersionId: null },
      select: { year: true, evalItemVersionId: true },
    });
    expect(result).toEqual({ year: 2026, evalItemVersionId: null });
  });
});
