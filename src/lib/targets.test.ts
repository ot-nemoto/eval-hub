// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "./errors";
import { createTarget, deleteTarget, getTargets, updateTarget } from "./targets";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    target: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    category: { count: vi.fn() },
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
      orderBy: { no: "asc" },
      select: { id: true, name: true, no: true },
    });
    expect(result).toHaveLength(2);
  });
});

describe("createTarget", () => {
  beforeEach(() => vi.clearAllMocks());

  it("大分類を作成して返す", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.target.create).mockResolvedValue({ id: 3, name: "new", no: 3 } as never);

    const result = await createTarget({ name: "new", no: 3 });

    expect(result).toEqual({ id: 3, name: "new", no: 3 });
  });

  it("同じ no が存在する場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.target.findUnique).mockResolvedValue(mockTargets[0] as never);

    await expect(createTarget({ name: "dup", no: 1 })).rejects.toThrow(ConflictError);
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
