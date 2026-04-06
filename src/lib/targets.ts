import { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function getTargets() {
  return prisma.target.findMany({
    orderBy: { no: "asc" },
    select: { id: true, name: true, no: true },
  });
}

export async function createTarget(data: { name: string; no: number }) {
  const existing = await prisma.target.findUnique({ where: { no: data.no } });
  if (existing) throw new ConflictError("同じ no の大分類がすでに存在します");

  try {
    return await prisma.target.create({
      data: { name: data.name, no: data.no },
      select: { id: true, name: true, no: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ConflictError("同じ no の大分類がすでに存在します");
    }
    throw e;
  }
}

export async function updateTarget(id: number, data: { name?: string; no?: number }) {
  const target = await prisma.target.findUnique({ where: { id } });
  if (!target) throw new NotFoundError("大分類が見つかりません");

  if (data.no !== undefined && data.no !== target.no) {
    const conflict = await prisma.target.findUnique({ where: { no: data.no } });
    if (conflict) throw new ConflictError("同じ no の大分類がすでに存在します");
  }

  return prisma.target.update({
    where: { id },
    data,
    select: { id: true, name: true, no: true },
  });
}

export async function deleteTarget(id: number) {
  const target = await prisma.target.findUnique({ where: { id } });
  if (!target) throw new NotFoundError("大分類が見つかりません");

  const categoryCount = await prisma.category.count({ where: { targetId: id } });
  if (categoryCount > 0) throw new ConflictError("紐づく中分類が存在するため削除できません");

  await prisma.target.delete({ where: { id } });
}
