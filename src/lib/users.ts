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

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new NotFoundError("ユーザーが見つかりません");

  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
}

export async function deleteUser(id: string, currentUserId: string) {
  if (id === currentUserId) throw new ForbiddenError("自分自身は削除できません");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new NotFoundError("ユーザーが見つかりません");

  const [assignmentCount, evaluationCount, settingCount] = await Promise.all([
    prisma.evaluationAssignment.count({
      where: { OR: [{ evaluateeId: id }, { evaluatorId: id }] },
    }),
    prisma.evaluation.count({ where: { evaluateeId: id } }),
    prisma.evaluationSetting.count({ where: { userId: id } }),
  ]);

  if (assignmentCount > 0 || evaluationCount > 0 || settingCount > 0)
    throw new ConflictError("評価データまたはアサインデータが存在するため削除できません");

  await prisma.user.delete({ where: { id } });
}
