// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedUser } from "./apiAuth";
import { hashApiKey } from "./apiKey";
import { buildAuditRecord } from "./auditLog";

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
      const legacyKey = "11111111-1111-4111-8111-111111111111";

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

// 監査ログのラッパーは認証ユーザーを知らないため、getAuthenticatedUser が
// Request インスタンスをキーに受け渡す。その経路を固定する。
describe("監査ログへの userId 受け渡し", () => {
  it("正常系: 認証が通ったユーザーが監査レコードに載る", async () => {
    // @ts-expect-error モックのため一部フィールドのみ
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-uuid",
      role: "MEMBER",
      isActive: true,
      apiKeyLastUsedAt: new Date(),
    });
    const req = makeRequest("Bearer valid-key");

    await getAuthenticatedUser(req);

    expect(buildAuditRecord(req, 200).userId).toBe("user-uuid");
  });

  // 退職者の未失効キーが漏洩した場合と、当てずっぽうの総当たりを
  // ログ上で区別できるようにする。サーバーは「誰のキーか」を知っている。
  it("異常系: 無効化済みユーザーのキーでも userId を記録する（401 は変わらない）", async () => {
    // @ts-expect-error モックのため一部フィールドのみ
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "deactivated-user",
      role: "MEMBER",
      isActive: false,
      apiKeyLastUsedAt: new Date(),
    });
    const req = makeRequest("Bearer deactivated-key");

    const result = await getAuthenticatedUser(req);

    expect(result).toBeNull();
    expect(buildAuditRecord(req, 401).userId).toBe("deactivated-user");
  });

  it("異常系: キーが一致しなければ userId は null のまま", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const req = makeRequest("Bearer invalid-key");

    await getAuthenticatedUser(req);

    expect(buildAuditRecord(req, 401).userId).toBeNull();
  });
});
