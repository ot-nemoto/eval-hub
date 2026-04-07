// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError } from "./errors";
import { getEvaluations, upsertEvaluation } from "./evaluations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluation: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockEvaluation = {
  evalItemId: 1,
  fiscalYear: 2024,
  evaluateeId: "user-1",
  selfScore: "ryo",
  selfReason: "理由",
  managerScore: null,
  managerReason: null,
  evaluationItem: { name: "評価項目A" },
};

describe("getEvaluations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("評価一覧を evalItemId 昇順で返す", async () => {
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue([mockEvaluation] as never);

    const result = await getEvaluations("user-1", 2024);

    expect(prisma.evaluation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fiscalYear: 2024, evaluateeId: "user-1" },
        orderBy: { evalItemId: "asc" },
      }),
    );
    expect(result).toEqual([
      {
        evalItemId: 1,
        itemName: "評価項目A",
        selfScore: "ryo",
        selfReason: "理由",
        managerScore: null,
        managerReason: null,
      },
    ]);
  });

  it("fiscalYear が範囲外の場合は BadRequestError をスロー", async () => {
    await expect(getEvaluations("user-1", 1800)).rejects.toThrow(BadRequestError);
  });

  it("fiscalYear が整数でない場合は BadRequestError をスロー", async () => {
    await expect(getEvaluations("user-1", 2024.5)).rejects.toThrow(BadRequestError);
  });
});

describe("upsertEvaluation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("評価を作成・更新して返す", async () => {
    vi.mocked(prisma.evaluation.upsert).mockResolvedValue(mockEvaluation as never);

    const result = await upsertEvaluation({
      fiscalYear: 2024,
      evaluateeId: "user-1",
      evalItemId: 1,
      selfScore: "ryo",
      selfReason: "理由",
    });

    expect(prisma.evaluation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fiscalYear_evaluateeId_evalItemId: {
            fiscalYear: 2024,
            evaluateeId: "user-1",
            evalItemId: 1,
          },
        },
      }),
    );
    expect(result).toEqual({
      evalItemId: 1,
      selfScore: "ryo",
      selfReason: "理由",
      managerScore: null,
      managerReason: null,
    });
  });

  it("fiscalYear が範囲外の場合は BadRequestError をスロー", async () => {
    await expect(
      upsertEvaluation({ fiscalYear: 1800, evaluateeId: "user-1", evalItemId: 1 }),
    ).rejects.toThrow(BadRequestError);
  });

  it("fiscalYear が整数でない場合は BadRequestError をスロー", async () => {
    await expect(
      upsertEvaluation({ fiscalYear: 2024.5, evaluateeId: "user-1", evalItemId: 1 }),
    ).rejects.toThrow(BadRequestError);
  });

  it("evalItemId が 0 以下の場合は BadRequestError をスロー", async () => {
    await expect(
      upsertEvaluation({ fiscalYear: 2024, evaluateeId: "user-1", evalItemId: 0 }),
    ).rejects.toThrow(BadRequestError);
  });

  it("evalItemId が整数でない場合は BadRequestError をスロー", async () => {
    await expect(
      upsertEvaluation({ fiscalYear: 2024, evaluateeId: "user-1", evalItemId: 1.5 }),
    ).rejects.toThrow(BadRequestError);
  });

  it("managerScore・managerReason を更新できる", async () => {
    vi.mocked(prisma.evaluation.upsert).mockResolvedValue({
      ...mockEvaluation,
      managerScore: "yu",
      managerReason: "評価コメント",
    } as never);

    const result = await upsertEvaluation({
      fiscalYear: 2024,
      evaluateeId: "user-1",
      evalItemId: 1,
      managerScore: "yu",
      managerReason: "評価コメント",
    });

    expect(result).toMatchObject({ managerScore: "yu", managerReason: "評価コメント" });
  });
});
