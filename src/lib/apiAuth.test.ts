// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedUser } from "./apiAuth";
import { hashApiKey } from "./apiKey";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

function makeRequest(authHeader?: string) {
  return new Request("http://localhost/api/evaluation-items", {
    headers: authHeader ? { authorization: authHeader } : {},
  }) as import("next/server").NextRequest;
}

const NOW = new Date("2026-10-11T12:00:00Z");
const HOUR_MS = 60 * 60 * 1000;

const activeAdmin = { id: "u1", role: "ADMIN" as const, isActive: true };
const recentlyUsed = { ...activeAdmin, apiKeyLastUsedAt: new Date(NOW.getTime() - 1000) };

describe("getAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => vi.useRealTimers());

  describe("正常系", () => {
    it("Bearer キーのハッシュで検索し、ユーザーを返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(recentlyUsed as never);

      const result = await getAuthenticatedUser(makeRequest("Bearer eh_valid"));

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { apiKeyHash: await hashApiKey("eh_valid") },
        select: { id: true, role: true, isActive: true, apiKeyLastUsedAt: true },
      });
      expect(result).toEqual(activeAdmin);
    });

    it("旧書式（UUID）のキーも書式で弾かずハッシュで検索する", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(recentlyUsed as never);
      const legacyKey = "6510b9a5-d70b-4377-841c-84ca8bbd0345";

      const result = await getAuthenticatedUser(makeRequest(`Bearer ${legacyKey}`));

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { apiKeyHash: await hashApiKey(legacyKey) } }),
      );
      expect(result).toEqual(activeAdmin);
    });

    it("未使用（lastUsedAt が null）なら lastUsedAt を更新する", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...activeAdmin,
        apiKeyLastUsedAt: null,
      } as never);

      await getAuthenticatedUser(makeRequest("Bearer eh_valid"));

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { apiKeyLastUsedAt: NOW },
      });
    });

    it("前回更新から 1 時間以上経過していれば lastUsedAt を更新する", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...activeAdmin,
        apiKeyLastUsedAt: new Date(NOW.getTime() - HOUR_MS),
      } as never);

      await getAuthenticatedUser(makeRequest("Bearer eh_valid"));

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });

    it("前回更新から 1 時間未満なら lastUsedAt を更新しない", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...activeAdmin,
        apiKeyLastUsedAt: new Date(NOW.getTime() - HOUR_MS + 1),
      } as never);

      await getAuthenticatedUser(makeRequest("Bearer eh_valid"));

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("異常系", () => {
    it("lastUsedAt の更新が失敗しても認証結果を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...activeAdmin,
        apiKeyLastUsedAt: null,
      } as never);
      vi.mocked(prisma.user.update).mockRejectedValue(new Error("connection error"));

      expect(await getAuthenticatedUser(makeRequest("Bearer eh_valid"))).toEqual(activeAdmin);
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });

    it("Authorization ヘッダーがない場合は null を返す", async () => {
      const result = await getAuthenticatedUser(makeRequest());
      expect(result).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("Bearer スキームでない場合は null を返す", async () => {
      const result = await getAuthenticatedUser(makeRequest("Basic abc123"));
      expect(result).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("トークンが空文字の場合は null を返す", async () => {
      const result = await getAuthenticatedUser(makeRequest("Bearer "));
      expect(result).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("DB にユーザーが存在しない場合は null を返す（lastUsedAt も更新しない）", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await getAuthenticatedUser(makeRequest("Bearer eh_unknown"));
      expect(result).toBeNull();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("isActive が false のユーザーは null を返す（lastUsedAt も更新しない）", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...activeAdmin,
        isActive: false,
        apiKeyLastUsedAt: null,
      } as never);

      const result = await getAuthenticatedUser(makeRequest("Bearer eh_inactive"));
      expect(result).toBeNull();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
