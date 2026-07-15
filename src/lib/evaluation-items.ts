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
  if (
    filter?.categoryId !== undefined &&
    (!Number.isInteger(filter.categoryId) || filter.categoryId < 1)
  )
    throw new BadRequestError("categoryId は 1 以上の整数で指定してください");

  const where: { targetId?: number; categoryId?: number } = {};
  if (filter?.targetId !== undefined) where.targetId = filter.targetId;
  if (filter?.categoryId !== undefined) where.categoryId = filter.categoryId;

  return prisma.evaluationItem.findMany({
    where,
    orderBy: [{ target: { index: "asc" } }, { category: { index: "asc" } }, { index: "asc" }],
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

  const maxIndex = await prisma.evaluationItem.findFirst({
    where: { categoryId: data.categoryId },
    orderBy: { index: "desc" },
    select: { index: true },
  });
  const index = (maxIndex?.index ?? 0) + 1;

  try {
    return await prisma.evaluationItem.create({
      data: {
        targetId: data.targetId,
        categoryId: data.categoryId,
        no,
        index,
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
  data: { name?: string; no?: number; description?: string | null; evalCriteria?: string | null },
) {
  const existing = await prisma.evaluationItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("評価項目が見つかりません");

  if (Object.keys(data).length === 0)
    throw new BadRequestError("更新するフィールドを指定してください");

  if (data.name !== undefined && !data.name.trim())
    throw new BadRequestError("name は空にできません");

  if (data.no !== undefined && data.no !== existing.no) {
    const conflict = await prisma.evaluationItem.findUnique({
      where: { categoryId_no: { categoryId: existing.categoryId, no: data.no } },
    });
    if (conflict) throw new ConflictError("同じ中分類内に同じ no の評価項目がすでに存在します");
  }

  try {
    return await prisma.evaluationItem.update({
      where: { id },
      data,
      select: itemSelect,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ConflictError("同じ中分類内に同じ no の評価項目がすでに存在します");
    }
    throw e;
  }
}

export async function reorderEvaluationItems(orders: { id: number; index: number }[]) {
  const OFFSET = 100000;
  try {
    await prisma.$transaction(async (tx) => {
      for (const { id, index } of orders) {
        await tx.evaluationItem.update({ where: { id }, data: { index: index + OFFSET } });
      }
      for (const { id, index } of orders) {
        await tx.evaluationItem.update({ where: { id }, data: { index } });
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") throw new NotFoundError("並び替え対象の評価項目が見つかりません");
      if (e.code === "P2002") throw new ConflictError("並び替え中に一意制約違反が発生しました");
    }
    throw e;
  }
}

export async function deleteEvaluationItem(id: number) {
  const existing = await prisma.evaluationItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("評価項目が見つかりません");

  await prisma.evaluationItem.delete({ where: { id } });
}

type ImportItem = {
  no: number;
  name: string;
  description?: string | null;
  evalCriteria?: string | null;
};
type ImportCategory = { no: number; name: string; items: ImportItem[] };
type ImportTarget = { no: number; name: string; categories: ImportCategory[] };

/**
 * 評価項目マスタ（targets / categories / evaluation_items）を一括置換する。
 * 既存の作業スペースを全削除してからツリーを再挿入し、index は送信順で 1 から採番する。
 * バージョン（eval_item_versions）には影響しない。no は各階層でユニーク（重複時 P2002→Conflict）。
 */
export async function bulkReplaceEvaluationItems(
  targets: ImportTarget[],
): Promise<{ created: number }> {
  for (const t of targets) {
    if (!Number.isInteger(t.no) || t.no < 1 || !t.name.trim())
      throw new BadRequestError("大項目に no（1以上の整数）と name（文字列）は必須です");
    for (const c of t.categories) {
      if (!Number.isInteger(c.no) || c.no < 1 || !c.name.trim())
        throw new BadRequestError("中項目に no（1以上の整数）と name（文字列）は必須です");
      for (const item of c.items) {
        if (!Number.isInteger(item.no) || item.no < 1 || !item.name.trim())
          throw new BadRequestError("評価項目に no（1以上の整数）と name（文字列）は必須です");
      }
    }
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        // 全削除（FK順: 評価項目→中分類→大分類）
        await tx.evaluationItem.deleteMany({});
        await tx.category.deleteMany({});
        await tx.target.deleteMany({});

        // 再挿入（大分類→中分類→評価項目）— 送信順で index を自動採番
        let created = 0;
        let targetIndex = 0;
        for (const targetInput of targets) {
          targetIndex++;
          const target = await tx.target.create({
            data: { no: targetInput.no, name: targetInput.name, index: targetIndex },
          });

          let categoryIndex = 0;
          for (const categoryInput of targetInput.categories) {
            categoryIndex++;
            const category = await tx.category.create({
              data: {
                targetId: target.id,
                no: categoryInput.no,
                name: categoryInput.name,
                index: categoryIndex,
              },
            });

            const itemsData = categoryInput.items.map((itemInput, i) => ({
              targetId: target.id,
              categoryId: category.id,
              no: itemInput.no,
              name: itemInput.name,
              description: itemInput.description ?? null,
              evalCriteria: itemInput.evalCriteria ?? null,
              index: i + 1,
            }));
            await tx.evaluationItem.createMany({ data: itemsData });
            created += itemsData.length;
          }
        }

        return { created };
      },
      { timeout: 30000 },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ConflictError("no が重複しています");
    }
    throw e;
  }
}
