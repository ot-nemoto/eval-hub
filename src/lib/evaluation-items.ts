import { Prisma } from "@prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const itemSelect = {
  id: true,
  targetId: true,
  categoryId: true,
  no: true,
  name: true,
  description: true,
  evalCriteria: true,
  target: { select: { id: true, name: true, no: true } },
  category: { select: { id: true, targetId: true, name: true, no: true } },
} as const;

export async function getEvaluationItems(filter?: { targetId?: number; categoryId?: number }) {
  if (filter?.targetId !== undefined && (!Number.isInteger(filter.targetId) || filter.targetId < 1))
    throw new BadRequestError("targetId は 1 以上の整数で指定してください");
  if (filter?.categoryId !== undefined && (!Number.isInteger(filter.categoryId) || filter.categoryId < 1))
    throw new BadRequestError("categoryId は 1 以上の整数で指定してください");

  const where: { targetId?: number; categoryId?: number } = {};
  if (filter?.targetId !== undefined) where.targetId = filter.targetId;
  if (filter?.categoryId !== undefined) where.categoryId = filter.categoryId;

  return prisma.evaluationItem.findMany({
    where,
    orderBy: [{ target: { no: "asc" } }, { category: { no: "asc" } }, { no: "asc" }],
    select: itemSelect,
  });
}

export async function createEvaluationItem(data: {
  targetId: number;
  categoryId: number;
  name: string;
  description?: string | null;
  evalCriteria?: string | null;
}) {
  if (!data.name.trim()) throw new BadRequestError("name は必須です");

  const target = await prisma.target.findUnique({ where: { id: data.targetId } });
  if (!target) throw new NotFoundError("大分類が見つかりません");

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw new NotFoundError("中分類が見つかりません");

  if (category.targetId !== data.targetId)
    throw new BadRequestError("categoryId が targetId と一致しません");

  const maxItem = await prisma.evaluationItem.findFirst({
    where: { categoryId: data.categoryId },
    orderBy: { no: "desc" },
    select: { no: true },
  });
  const no = (maxItem?.no ?? 0) + 1;

  try {
    return await prisma.evaluationItem.create({
      data: {
        targetId: data.targetId,
        categoryId: data.categoryId,
        no,
        name: data.name,
        description: data.description ?? null,
        evalCriteria: data.evalCriteria ?? null,
      },
      select: itemSelect,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ConflictError("同じ名称の評価項目が既に存在します");
    }
    throw e;
  }
}

export async function updateEvaluationItem(
  id: number,
  data: { name?: string; description?: string | null; evalCriteria?: string | null },
) {
  const existing = await prisma.evaluationItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("評価項目が見つかりません");

  if (Object.keys(data).length === 0)
    throw new BadRequestError("更新するフィールドを指定してください");

  return prisma.evaluationItem.update({
    where: { id },
    data,
    select: itemSelect,
  });
}

export async function deleteEvaluationItem(id: number) {
  const existing = await prisma.evaluationItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("評価項目が見つかりません");

  const linked = await prisma.fiscalYearItem.count({ where: { evaluationItemId: id } });
  if (linked > 0) throw new ConflictError("年度に紐づいているため削除できません");

  try {
    await prisma.evaluationItem.delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      throw new ConflictError("年度に紐づいているため削除できません");
    }
    throw e;
  }
}
