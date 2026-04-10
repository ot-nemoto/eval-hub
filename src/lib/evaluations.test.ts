// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError } from "./errors";
import {
  addManagerComment,
  deleteManagerComment,
  getAllSelfEvaluations,
  getEvaluationProgress,
  getEvaluations,
  updateManagerComment,
  upsertEvaluation,
  upsertManagerScore,
} from "./evaluations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluation: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    evaluationAssignment: {
      findMany: vi.fn(),
    },
    fiscalYearItem: {
      findMany: vi.fn(),
    },
    managerComment: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockEvaluation = {
  id: "eval-1",
  evalItemId: 1,
  fiscalYear: 2024,
  evaluateeId: "user-1",
  selfScore: "ryo",
  selfReason: "理由",
  managerScore: null,
  evaluationItem: { name: "評価項目A" },
  managerComments: [],
};

const mockSelfEvaluationRow = {
  id: "eval-1",
  evaluatee: { id: "user-1", name: "テストユーザー" },
  evaluationItem: {
    no: 1,
    name: "評価項目A",
    target: { no: 1 },
    category: { no: 1 },
  },
  selfScore: "ryo",
  selfReason: "理由",
  updatedAt: new Date("2026-01-01"),
};

describe("getAllSelfEvaluations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: findMany が正しい where/orderBy で呼ばれ、整形された結果を返す", async () => {
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue([mockSelfEvaluationRow] as never);

    const result = await getAllSelfEvaluations(2026);

    expect(prisma.evaluation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fiscalYear: 2026, evaluatee: { isActive: true } },
        orderBy: [
          { evaluatee: { name: "asc" } },
          { evaluationItem: { target: { no: "asc" } } },
          { evaluationItem: { category: { no: "asc" } } },
          { evaluationItem: { no: "asc" } },
        ],
      }),
    );
    expect(result).toEqual([
      {
        id: "eval-1",
        evaluatee: { id: "user-1", name: "テストユーザー" },
        item: { uid: "1-1-1", name: "評価項目A" },
        selfScore: "ryo",
        selfReason: "理由",
        updatedAt: new Date("2026-01-01"),
      },
    ]);
  });

  it("userId フィルタあり: evaluateeId が where に含まれる", async () => {
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue([] as never);

    await getAllSelfEvaluations(2026, { userId: "user-1" });

    expect(prisma.evaluation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fiscalYear: 2026, evaluatee: { isActive: true }, evaluateeId: "user-1" },
      }),
    );
  });

  it("userId フィルタなし: evaluateeId が where に含まれない", async () => {
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue([] as never);

    await getAllSelfEvaluations(2026, {});

    expect(prisma.evaluation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fiscalYear: 2026, evaluatee: { isActive: true } },
      }),
    );
  });

  it("fiscalYear が範囲外の場合は BadRequestError をスロー", async () => {
    await expect(getAllSelfEvaluations(1800)).rejects.toThrow(BadRequestError);
  });

  it("fiscalYear が整数でない場合は BadRequestError をスロー", async () => {
    await expect(getAllSelfEvaluations(2026.5)).rejects.toThrow(BadRequestError);
  });
});

describe("getEvaluations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("評価一覧を evalItemId 昇順で返し、managerComments 配列を含む", async () => {
    const evalWithComments = {
      ...mockEvaluation,
      managerComments: [
        {
          id: "comment-1",
          evaluatorId: "manager-1",
          evaluator: { name: "上長A" },
          reason: "よくできました",
          createdAt: new Date("2026-01-02"),
        },
      ],
    };
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue([evalWithComments] as never);

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
        evaluationId: "eval-1",
        itemName: "評価項目A",
        selfScore: "ryo",
        selfReason: "理由",
        managerScore: null,
        managerComments: [
          {
            id: "comment-1",
            evaluatorId: "manager-1",
            evaluatorName: "上長A",
            reason: "よくできました",
            createdAt: new Date("2026-01-02"),
          },
        ],
      },
    ]);
  });

  it("コメントなしの場合は managerComments が空配列・managerScore は null", async () => {
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue([mockEvaluation] as never);

    const result = await getEvaluations("user-1", 2024);

    expect(result[0].managerComments).toEqual([]);
    expect(result[0].managerScore).toBeNull();
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
});

describe("upsertManagerScore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("evaluation を upsert して managerScore を更新する", async () => {
    vi.mocked(prisma.evaluation.upsert).mockResolvedValue({
      ...mockEvaluation,
      managerScore: "yu",
    } as never);

    const result = await upsertManagerScore("user-1", 2024, 1, "yu");

    expect(prisma.evaluation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fiscalYear_evaluateeId_evalItemId: {
            fiscalYear: 2024,
            evaluateeId: "user-1",
            evalItemId: 1,
          },
        },
        create: expect.objectContaining({ managerScore: "yu" }),
        update: { managerScore: "yu" },
      }),
    );
    expect(result).toEqual({ evalItemId: 1, managerScore: "yu" });
  });

  it("managerScore に null を渡すとクリアできる", async () => {
    vi.mocked(prisma.evaluation.upsert).mockResolvedValue({
      ...mockEvaluation,
      managerScore: null,
    } as never);

    const result = await upsertManagerScore("user-1", 2024, 1, null);

    expect(result.managerScore).toBeNull();
  });

  it("fiscalYear が範囲外の場合は BadRequestError をスロー", async () => {
    await expect(upsertManagerScore("user-1", 1800, 1, "yu")).rejects.toThrow(BadRequestError);
  });

  it("evalItemId が正の整数でない場合は BadRequestError をスロー", async () => {
    await expect(upsertManagerScore("user-1", 2024, 0, "yu")).rejects.toThrow(BadRequestError);
  });
});

describe("addManagerComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("evaluation が存在しなければ upsert で作成し、コメントを追加する", async () => {
    vi.mocked(prisma.evaluation.upsert).mockResolvedValue(mockEvaluation as never);
    const mockComment = {
      id: "comment-1",
      evaluationId: "eval-1",
      evaluatorId: "manager-1",
      score: null,
      reason: "よくできました",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.managerComment.create).mockResolvedValue(mockComment as never);

    const result = await addManagerComment("user-1", 2024, 1, "manager-1", {
      reason: "よくできました",
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
    expect(prisma.managerComment.create).toHaveBeenCalledWith({
      data: {
        evaluationId: "eval-1",
        evaluatorId: "manager-1",
        reason: "よくできました",
      },
    });
    expect(result).toEqual(mockComment);
  });

  it("fiscalYear が範囲外の場合は BadRequestError をスロー", async () => {
    await expect(
      addManagerComment("user-1", 1800, 1, "manager-1", { reason: null }),
    ).rejects.toThrow(BadRequestError);
  });

  it("evalItemId が正の整数でない場合は BadRequestError をスロー", async () => {
    await expect(
      addManagerComment("user-1", 2024, 0, "manager-1", { reason: null }),
    ).rejects.toThrow(BadRequestError);
  });
});

describe("updateManagerComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("コメントを更新して返す", async () => {
    const mockUpdated = {
      id: "comment-1",
      evaluationId: "eval-1",
      evaluatorId: "manager-1",
      score: null,
      reason: "修正後",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.managerComment.update).mockResolvedValue(mockUpdated as never);

    const result = await updateManagerComment("comment-1", { reason: "修正後" });

    expect(prisma.managerComment.update).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      data: { reason: "修正後" },
    });
    expect(result).toEqual(mockUpdated);
  });
});

describe("deleteManagerComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("コメントを削除する", async () => {
    vi.mocked(prisma.managerComment.delete).mockResolvedValue({} as never);

    await deleteManagerComment("comment-1");

    expect(prisma.managerComment.delete).toHaveBeenCalledWith({
      where: { id: "comment-1" },
    });
  });
});

describe("getEvaluationProgress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 被評価者ごとの進捗を集計して返す", async () => {
    const now = new Date("2026-04-01T10:00:00Z");
    const older = new Date("2026-03-01T10:00:00Z");

    vi.mocked(prisma.evaluationAssignment.findMany).mockResolvedValue([
      { evaluateeId: "user-1", evaluatee: { name: "田中" } },
      { evaluateeId: "user-2", evaluatee: { name: "鈴木" } },
    ] as never);
    vi.mocked(prisma.fiscalYearItem.findMany).mockResolvedValue([
      { evaluationItemId: 1 },
      { evaluationItemId: 2 },
      { evaluationItemId: 3 },
    ] as never);
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue([
      { evaluateeId: "user-1", selfScore: "ryo", managerScore: "yu", updatedAt: now },
      { evaluateeId: "user-1", selfScore: "ka", managerScore: null, updatedAt: older },
      { evaluateeId: "user-1", selfScore: null, managerScore: null, updatedAt: older },
      { evaluateeId: "user-2", selfScore: null, managerScore: null, updatedAt: older },
    ] as never);

    const result = await getEvaluationProgress(2026);

    expect(result).toEqual([
      {
        evaluateeId: "user-1",
        name: "田中",
        totalItems: 3,
        selfScored: 2,
        managerScored: 1,
        lastUpdatedAt: now,
      },
      {
        evaluateeId: "user-2",
        name: "鈴木",
        totalItems: 3,
        selfScored: 0,
        managerScored: 0,
        lastUpdatedAt: older,
      },
    ]);
  });

  it("評価レコードがない被評価者は lastUpdatedAt が null になる", async () => {
    vi.mocked(prisma.evaluationAssignment.findMany).mockResolvedValue([
      { evaluateeId: "user-1", evaluatee: { name: "田中" } },
    ] as never);
    vi.mocked(prisma.fiscalYearItem.findMany).mockResolvedValue([
      { evaluationItemId: 1 },
      { evaluationItemId: 2 },
      { evaluationItemId: 3 },
      { evaluationItemId: 4 },
      { evaluationItemId: 5 },
    ] as never);
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue([] as never);

    const result = await getEvaluationProgress(2026);

    expect(result).toEqual([
      {
        evaluateeId: "user-1",
        name: "田中",
        totalItems: 5,
        selfScored: 0,
        managerScored: 0,
        lastUpdatedAt: null,
      },
    ]);
  });

  it("fiscalYear が範囲外の場合は BadRequestError をスロー", async () => {
    await expect(getEvaluationProgress(1800)).rejects.toThrow(BadRequestError);
  });

  it("fiscalYear が整数でない場合は BadRequestError をスロー", async () => {
    await expect(getEvaluationProgress(2024.5)).rejects.toThrow(BadRequestError);
  });
});
