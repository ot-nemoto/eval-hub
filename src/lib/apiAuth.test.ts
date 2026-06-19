// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedUser } from "./apiAuth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

function makeRequest(authHeader?: string) {
  return new Request("http://localhost/api/evaluation-items", {
    headers: authHeader ? { authorization: authHeader } : {},
  }) as import("next/server").NextRequest;
}

const activeAdmin = { id: "u1", role: "ADMIN" as const, isActive: true };

describe("getAuthenticatedUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("有効な Bearer トークンでユーザーを返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(activeAdmin as never);

    const result = await getAuthenticatedUser(makeRequest("Bearer valid-key"));

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { apiKey: "valid-key" },
      select: { id: true, role: true, isActive: true },
    });
    expect(result).toEqual(activeAdmin);
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

  it("DB にユーザーが存在しない場合は null を返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await getAuthenticatedUser(makeRequest("Bearer unknown-key"));
    expect(result).toBeNull();
  });

  it("isActive が false のユーザーは null を返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...activeAdmin,
      isActive: false,
    } as never);

    const result = await getAuthenticatedUser(makeRequest("Bearer inactive-key"));
    expect(result).toBeNull();
  });
});
