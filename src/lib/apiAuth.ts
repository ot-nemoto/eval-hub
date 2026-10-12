import type { NextRequest } from "next/server";
import { hashApiKey } from "@/lib/apiKey";
import { prisma } from "@/lib/prisma";

// 棚卸し用途には時間単位の粒度で足りるため、毎リクエストの書き込みを避ける
const LAST_USED_UPDATE_INTERVAL_MS = 60 * 60 * 1000;

export async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) return null;
  // 旧書式（UUID）の移行済みキーも受け付けるため、書式チェックはしない
  const user = await prisma.user.findUnique({
    where: { apiKeyHash: await hashApiKey(apiKey) },
    select: { id: true, role: true, isActive: true, apiKeyLastUsedAt: true },
  });
  if (!user?.isActive) return null;

  const { apiKeyLastUsedAt, ...authUser } = user;
  const now = new Date();
  if (
    !apiKeyLastUsedAt ||
    now.getTime() - apiKeyLastUsedAt.getTime() >= LAST_USED_UPDATE_INTERVAL_MS
  ) {
    // 棚卸し用の付随情報であり、更新失敗で認証済みリクエストを落とさない（次回リクエストで再試行される）
    try {
      await prisma.user.update({ where: { id: user.id }, data: { apiKeyLastUsedAt: now } });
    } catch {}
  }
  return authUser;
}
