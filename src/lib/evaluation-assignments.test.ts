// @vitest-environment node
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError, ConflictError, NotFoundError } from "./errors";
import {
  createEvaluationAssignment,
  deleteEvaluationAssignment,
  getEvaluationAssignments,
} from "./evaluation-assignments";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluationAssignment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockAssignment = {
  id: "assign-1",
  fiscalYear: 2024,
  evaluateeId: "user-1",
  evaluatorId: "user-2",
  evaluatee: { id: "user-1", name: "被評価者" },
  evaluator: { id: "user-2", name: "評価者" },
};

describe("getEvaluationAssignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("アサイン一覧を返す", async () => {
    vi.mocked(prisma.evaluationAssignment.findMany).mockResolvedValue([mockAssignment] as never);

    const result = await getEvaluationAssignments();

    expect(prisma.evaluationAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ fiscalYear: "desc" }, { evaluateeId: "asc" }] }),
    );
    expect(result).toEqual([
      {
        id: "assign-1",
        fiscalYear: 2024,
        evaluatee: { id: "user-1", name: "被評価者" },
        evaluator: { id: "user-2", name: "評価者" },
      },
    ]);
  });

  it("fiscalYear フィルタを指定して取得できる", async () => {
    vi.mocked(prisma.evaluationAssignment.findMany).mockResolvedValue([mockAssignment] as never);

    await getEvaluationAssignments({ fiscalYear: 2024 });

    expect(prisma.evaluationAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { fiscalYear: 2024 } }),
    );
  });

  it("evaluateeId フィルタを指定して取得できる", async () => {
    vi.mocked(prisma.evaluationAssignment.findMany).mockResolvedValue([mockAssignment] as never);

    await getEvaluationAssignments({ evaluateeId: "user-1" });

    expect(prisma.evaluationAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { evaluateeId: "user-1" } }),
    );
  });

  it("fiscalYear が範囲外の場合は BadRequestError をスロー", async () => {
    await expect(getEvaluationAssignments({ fiscalYear: 1800 })).rejects.toThrow(BadRequestError);
  });

  it("fiscalYear が整数でない場合は BadRequestError をスロー", async () => {
    await expect(getEvaluationAssignments({ fiscalYear: 2024.5 })).rejects.toThrow(BadRequestError);
  });
});

describe("createEvaluationAssignment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("アサインを作成して返す", async () => {
    vi.mocked(prisma.evaluationAssignment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.evaluationAssignment.create).mockResolvedValue(mockAssignment as never);

    const result = await createEvaluationAssignment({
      fiscalYear: 2024,
      evaluateeId: "user-1",
      evaluatorId: "user-2",
    });

    expect(prisma.evaluationAssignment.create).toHaveBeenCalledWith({
      data: { fiscalYear: 2024, evaluateeId: "user-1", evaluatorId: "user-2" },
    });
    expect(result).toEqual(mockAssignment);
  });

  it("fiscalYear が範囲外の場合は BadRequestError をスロー", async () => {
    await expect(
      createEvaluationAssignment({ fiscalYear: 1800, evaluateeId: "user-1", evaluatorId: "user-2" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("evaluateeId が空の場合は BadRequestError をスロー", async () => {
    await expect(
      createEvaluationAssignment({ fiscalYear: 2024, evaluateeId: "", evaluatorId: "user-2" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("evaluatorId が空の場合は BadRequestError をスロー", async () => {
    await expect(
      createEvaluationAssignment({ fiscalYear: 2024, evaluateeId: "user-1", evaluatorId: "" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("同一の組み合わせが存在する場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.evaluationAssignment.findUnique).mockResolvedValue(mockAssignment as never);

    await expect(
      createEvaluationAssignment({ fiscalYear: 2024, evaluateeId: "user-1", evaluatorId: "user-2" }),
    ).rejects.toThrow(ConflictError);
  });

  it("DB の P2002（同時実行競合）の場合は ConflictError をスロー", async () => {
    vi.mocked(prisma.evaluationAssignment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.evaluationAssignment.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "5",
      }),
    );

    await expect(
      createEvaluationAssignment({ fiscalYear: 2024, evaluateeId: "user-1", evaluatorId: "user-2" }),
    ).rejects.toThrow(ConflictError);
  });
});

describe("deleteEvaluationAssignment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("アサインを削除する", async () => {
    vi.mocked(prisma.evaluationAssignment.findUnique).mockResolvedValue(mockAssignment as never);

    await deleteEvaluationAssignment("assign-1");

    expect(prisma.evaluationAssignment.delete).toHaveBeenCalledWith({ where: { id: "assign-1" } });
  });

  it("存在しない id の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.evaluationAssignment.findUnique).mockResolvedValue(null);

    await expect(deleteEvaluationAssignment("unknown")).rejects.toThrow(NotFoundError);
  });
});
