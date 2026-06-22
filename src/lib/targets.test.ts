// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "./errors";
import { createTarget, deleteTarget, getTargets, reorderTargets, updateTarget } from "./targets";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    target: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    category: { count: vi.fn() },
    $transaction: vi.fn((cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        target: { update: vi.mocked(prisma.target.update) },
      }),
    ),
  },
}));

import { prisma } from "@/lib/prisma";

const mockTargets = [
  { id: 1, name: "employee", no: 1 },
  { id: 2, name: "projects", no: 2 },
];

describe("getTargets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("大分類一覧を no 昇順で返す", async () => {
    vi.mocked(prisma.target.findMany).mockResolvedValue(mockTargets as never);

    const result = await getTargets();

    expect(prisma.target.findMany).toHaveBeenCalledWith({
      orderBy: { index: "asc" },
      select: { id: true, name: true, no: true, index: true },
    });
    expect(result).toHaveLength(2);
  });
});

describe("createTarget", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no と index を自動採番して大分類を作成する", async () => {
    vi.mocked(prisma.target.findFirst)
      .mockResolvedValueOnce({ no: 2 } as never)
      .mockResolvedValueOnce({ index: 2 } as never);
    vi.mocked(prisma.target.create).mockResolvedValue({
      id: 3,
      name: "new",
      no: 3,
      index: 3,
    } as never);

    const result = await createTarget({ name: "new" });

    expect(prisma.target.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "new", no: 3, index: 3 } }),
    );
    expect(result).toEqual({ id: 3, name: "new", no: 3, index: 3 });
  });

  it("大分類が存在しない場合は no=1, index=1 で作成する", async () => {
    vi.mocked(prisma.target.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.target.create).mockResolvedValue({
      id: 1,
      name: "first",
      no: 1,
      index: 1,
    } as never);

    await createTarget({ name: "first" });

    expect(prisma.target.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "first", no: 1, index: 1 } }),
    );
  });
});

describe("updateTarget", () => {
  beforeEach(() => vi.clearAllMocks());

  it("大分類を更新して返す", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTargets[0] as never);
    vi.mocked(prisma.target.update).mockResolvedValue({ id: 1, name: "updated", no: 1 } as never);

    const result = await updateTarget(1, { name: "updated" });

    expect(result).toEqual({ id: 1, name: "updated", no: 1 });
  });

  it("存在しない id の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(null);

    await expect(updateTarget(99, { name: "x" })).rejects.toThrow(NotFoundError);
  });

  it("no を変更する際に重複がある場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.target.findUnique)
      .mockResolvedValueOnce(mockTargets[0] as never) // target exists
      .mockResolvedValueOnce(mockTargets[1] as never); // conflicting target exists

    await expect(updateTarget(1, { no: 2 })).rejects.toThrow(ConflictError);
  });

  it("no を変更しない場合は重複チェックをスキップ", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTargets[0] as never);
    vi.mocked(prisma.target.update).mockResolvedValue({ id: 1, name: "renamed", no: 1 } as never);

    await expect(updateTarget(1, { name: "renamed" })).resolves.not.toThrow();
    expect(prisma.target.findUnique).toHaveBeenCalledTimes(1);
  });
});

describe("reorderTargets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("2ステップで index を更新する", async () => {
    vi.mocked(prisma.target.update).mockResolvedValue({} as never);

    await reorderTargets([
      { id: 1, index: 2 },
      { id: 2, index: 1 },
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.target.update).toHaveBeenCalledTimes(4);
    expect(prisma.target.update).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: { index: 100002 },
    });
    expect(prisma.target.update).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      data: { index: 100001 },
    });
    expect(prisma.target.update).toHaveBeenNthCalledWith(3, {
      where: { id: 1 },
      data: { index: 2 },
    });
    expect(prisma.target.update).toHaveBeenNthCalledWith(4, {
      where: { id: 2 },
      data: { index: 1 },
    });
  });
});

describe("deleteTarget", () => {
  beforeEach(() => vi.clearAllMocks());

  it("大分類を削除する", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTargets[0] as never);
    vi.mocked(prisma.category.count).mockResolvedValue(0);
    vi.mocked(prisma.target.delete).mockResolvedValue(mockTargets[0] as never);

    await expect(deleteTarget(1)).resolves.not.toThrow();
    expect(prisma.target.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("存在しない id の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(null);

    await expect(deleteTarget(99)).rejects.toThrow(NotFoundError);
  });

  it("紐づく中分類が存在する場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTargets[0] as never);
    vi.mocked(prisma.category.count).mockResolvedValue(2);

    await expect(deleteTarget(1)).rejects.toThrow(ConflictError);
  });
});
