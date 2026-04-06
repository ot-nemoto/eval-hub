import { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function getCategories(targetId?: number) {
  const where = targetId !== undefined ? { targetId } : {};
  return prisma.category.findMany({
    where,
    orderBy: { no: "asc" },
    select: { id: true, targetId: true, name: true, no: true },
  });
}

export async function createCategory(data: { targetId: number; name: string; no: number }) {
  const target = await prisma.target.findUnique({ where: { id: data.targetId } });
  if (!target) throw new NotFoundError("大分類が見つかりません");

  const existing = await prisma.category.findUnique({
    where: { targetId_no: { targetId: data.targetId, no: data.no } },
  });
  if (existing) throw new ConflictError("同じ targetId と no の中分類がすでに存在します");

  try {
    return await prisma.category.create({
      data: { targetId: data.targetId, name: data.name, no: data.no },
      select: { id: true, targetId: true, name: true, no: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ConflictError("同じ targetId と no の中分類がすでに存在します");
    }
    throw e;
  }
}

export async function updateCategory(id: number, data: { name?: string; no?: number }) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new NotFoundError("中分類が見つかりません");

  if (data.no !== undefined && data.no !== category.no) {
    const conflict = await prisma.category.findUnique({
      where: { targetId_no: { targetId: category.targetId, no: data.no } },
    });
    if (conflict) throw new ConflictError("同じ targetId と no の中分類がすでに存在します");
  }

  return prisma.category.update({
    where: { id },
    data,
    select: { id: true, targetId: true, name: true, no: true },
  });
}

export async function deleteCategory(id: number) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new NotFoundError("中分類が見つかりません");

  const itemCount = await prisma.evaluationItem.count({ where: { categoryId: id } });
  if (itemCount > 0) throw new ConflictError("紐づく評価項目が存在するため削除できません");

  await prisma.category.delete({ where: { id } });
}
