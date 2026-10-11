import { API_KEY_DISPLAY_PREFIX_LENGTH, createApiKeyValue, hashApiKey } from "@/lib/apiKey";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  division: true,
  joinedAt: true,
  createdAt: true,
  isActive: true,
} as const;

export async function getUsers() {
  return prisma.user.findMany({
    select: userSelect,
    orderBy: { name: "asc" },
  });
}

export async function updateUser(
  id: string,
  data: { role?: "ADMIN" | "MEMBER"; isActive?: boolean },
  currentUserId: string,
) {
  if (id === currentUserId) throw new ForbiddenError("自分自身のロールは変更できません");

  if (data.role === undefined && data.isActive === undefined)
    throw new BadRequestError(
      "role は 'ADMIN' または 'MEMBER'、isActive は true または false で指定してください",
    );

  if (data.role !== undefined && data.role !== "ADMIN" && data.role !== "MEMBER")
    throw new BadRequestError("role は 'ADMIN' または 'MEMBER' で指定してください");

  if (data.isActive !== undefined && typeof data.isActive !== "boolean")
    throw new BadRequestError("isActive は true または false で指定してください");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new NotFoundError("ユーザーが見つかりません");

  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
}

export async function updateUserName(userId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new BadRequestError("名前を入力してください");

  return prisma.user.update({
    where: { id: userId },
    data: { name: trimmed },
    select: { id: true, name: true },
  });
}

/**
 * API キーを新規発行（再生成）する。既存キーは上書きされ即時無効になる。
 * DB にはハッシュと表示用 prefix のみ保存し、生値は戻り値でのみ返す（show-once）。
 */
export async function generateApiKey(input: { id: string }): Promise<{ apiKey: string }> {
  const { id } = input;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError("ユーザーが見つかりません");

  const apiKey = createApiKeyValue();
  await prisma.user.update({
    where: { id },
    data: {
      apiKeyHash: await hashApiKey(apiKey),
      apiKeyPrefix: apiKey.slice(0, API_KEY_DISPLAY_PREFIX_LENGTH),
      apiKeyCreatedAt: new Date(),
      apiKeyLastUsedAt: null,
    },
  });
  return { apiKey };
}

export async function revokeApiKey(input: { id: string }): Promise<void> {
  const { id } = input;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError("ユーザーが見つかりません");

  await prisma.user.update({
    where: { id },
    data: { apiKeyHash: null, apiKeyPrefix: null, apiKeyCreatedAt: null, apiKeyLastUsedAt: null },
  });
}

export async function deleteUser(id: string, currentUserId: string) {
  if (id === currentUserId) throw new ForbiddenError("自分自身は削除できません");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new NotFoundError("ユーザーが見つかりません");

  const [assignmentCount, evaluationCount, settingCount, commentCount] = await Promise.all([
    prisma.evaluationAssignment.count({
      where: { OR: [{ evaluateeId: id }, { evaluatorId: id }] },
    }),
    prisma.evaluation.count({ where: { evaluateeId: id } }),
    prisma.evaluationSetting.count({ where: { userId: id } }),
    prisma.managerComment.count({ where: { evaluatorId: id } }),
  ]);

  if (assignmentCount > 0 || evaluationCount > 0 || settingCount > 0 || commentCount > 0)
    throw new ConflictError("評価データまたはアサインデータが存在するため削除できません");

  await prisma.user.delete({ where: { id } });
}
