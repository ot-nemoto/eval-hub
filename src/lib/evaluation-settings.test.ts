// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError, NotFoundError } from "./errors";
import { getEvaluationSettings, upsertEvaluationSetting } from "./evaluation-settings";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    evaluationSetting: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockUser = {
  id: "user-1",
  name: "テストユーザー",
  email: "test@example.com",
  role: "MEMBER",
};

const mockSetting = {
  userId: "user-1",
  fiscalYear: 2024,
  selfEvaluationEnabled: true,
};

describe("getEvaluationSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ユーザーの評価設定一覧を fiscalYear 降順で返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.evaluationSetting.findMany).mockResolvedValue([mockSetting] as never);

    const result = await getEvaluationSettings("user-1");

    expect(prisma.evaluationSetting.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { fiscalYear: "desc" } }),
    );
    expect(result).toEqual([{ fiscalYear: 2024, selfEvaluationEnabled: true }]);
  });

  it("存在しない userId の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(getEvaluationSettings("unknown")).rejects.toThrow(NotFoundError);
  });
});

describe("upsertEvaluationSetting", () => {
  beforeEach(() => vi.clearAllMocks());

  it("評価設定を作成・更新して返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.evaluationSetting.upsert).mockResolvedValue(mockSetting as never);

    const result = await upsertEvaluationSetting("user-1", 2024, { selfEvaluationEnabled: true });

    expect(prisma.evaluationSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_fiscalYear: { userId: "user-1", fiscalYear: 2024 } },
        update: { selfEvaluationEnabled: true },
        create: { userId: "user-1", fiscalYear: 2024, selfEvaluationEnabled: true },
      }),
    );
    expect(result).toEqual({ fiscalYear: 2024, selfEvaluationEnabled: true });
  });

  it("fiscalYear が範囲外の場合は BadRequestError をスロー", async () => {
    await expect(
      upsertEvaluationSetting("user-1", 1800, { selfEvaluationEnabled: true }),
    ).rejects.toThrow(BadRequestError);
  });

  it("fiscalYear が整数でない場合は BadRequestError をスロー", async () => {
    await expect(
      upsertEvaluationSetting("user-1", 2024.5, { selfEvaluationEnabled: true }),
    ).rejects.toThrow(BadRequestError);
  });

  it("selfEvaluationEnabled が boolean でない場合は BadRequestError をスロー", async () => {
    await expect(
      upsertEvaluationSetting("user-1", 2024, { selfEvaluationEnabled: "true" as unknown as boolean }),
    ).rejects.toThrow(BadRequestError);
  });

  it("存在しない userId の場合は NotFoundError をスロー", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(
      upsertEvaluationSetting("unknown", 2024, { selfEvaluationEnabled: true }),
    ).rejects.toThrow(NotFoundError);
  });

  it("selfEvaluationEnabled を false に更新できる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.evaluationSetting.upsert).mockResolvedValue({
      ...mockSetting,
      selfEvaluationEnabled: false,
    } as never);

    const result = await upsertEvaluationSetting("user-1", 2024, { selfEvaluationEnabled: false });

    expect(result).toEqual({ fiscalYear: 2024, selfEvaluationEnabled: false });
  });
});
