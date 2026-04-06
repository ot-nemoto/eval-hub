import { Prisma } from "@prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const fiscalYearSelect = {
  year: true,
  name: true,
  startDate: true,
  endDate: true,
  isCurrent: true,
} as const;

export async function getFiscalYears() {
  return prisma.fiscalYear.findMany({
    orderBy: { year: "desc" },
    select: fiscalYearSelect,
  });
}

export async function createFiscalYear(data: {
  year: number;
  name: string;
  startDate: string;
  endDate: string;
}) {
  if (!Number.isInteger(data.year) || data.year < 1900 || data.year > 9999)
    throw new BadRequestError("year は 1900〜9999 の整数で指定してください");
  if (!data.name.trim()) throw new BadRequestError("name は必須です");

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
    throw new BadRequestError("startDate, endDate は有効な日付形式で指定してください");
  if (startDate > endDate)
    throw new BadRequestError("startDate は endDate 以前の日付を指定してください");

  const existing = await prisma.fiscalYear.findUnique({ where: { year: data.year } });
  if (existing) throw new ConflictError("同じ年度がすでに存在します");

  const latestFy = await prisma.fiscalYear.findFirst({
    where: { year: { lt: data.year } },
    orderBy: { year: "desc" },
    select: { year: true },
  });

  try {
    return await prisma.$transaction(async (tx) => {
      const fy = await tx.fiscalYear.create({
        data: { year: data.year, name: data.name, startDate, endDate },
        select: fiscalYearSelect,
      });

      if (latestFy) {
        const sourceItems = await tx.fiscalYearItem.findMany({
          where: { fiscalYear: latestFy.year },
          select: { evaluationItemId: true },
        });
        if (sourceItems.length > 0) {
          await tx.fiscalYearItem.createMany({
            data: sourceItems.map((item) => ({
              fiscalYear: data.year,
              evaluationItemId: item.evaluationItemId,
            })),
          });
        }
      }

      return fy;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ConflictError("同じ年度がすでに存在します");
    }
    throw e;
  }
}

export async function updateFiscalYear(
  year: number,
  data: { name?: string; startDate?: string; endDate?: string; isCurrent?: boolean },
) {
  if (Object.keys(data).length === 0)
    throw new BadRequestError("更新するフィールドを指定してください");

  const target = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!target) throw new NotFoundError("年度が見つかりません");

  const updateData: {
    name?: string;
    startDate?: Date;
    endDate?: Date;
    isCurrent?: boolean;
  } = {};
  if (data.name !== undefined) {
    if (!data.name.trim()) throw new BadRequestError("name は必須です");
    updateData.name = data.name.trim();
  }
  if (data.startDate !== undefined) {
    const d = new Date(data.startDate);
    if (Number.isNaN(d.getTime()))
      throw new BadRequestError("startDate は有効な日付形式で指定してください");
    updateData.startDate = d;
  }
  if (data.endDate !== undefined) {
    const d = new Date(data.endDate);
    if (Number.isNaN(d.getTime()))
      throw new BadRequestError("endDate は有効な日付形式で指定してください");
    updateData.endDate = d;
  }
  if (data.isCurrent !== undefined) updateData.isCurrent = data.isCurrent;

  const effectiveStart = updateData.startDate ?? target.startDate;
  const effectiveEnd = updateData.endDate ?? target.endDate;
  if (effectiveStart > effectiveEnd)
    throw new BadRequestError("startDate は endDate 以前の日付を指定してください");

  return prisma.$transaction(async (tx) => {
    if (updateData.isCurrent === true) {
      await tx.fiscalYear.updateMany({
        where: { isCurrent: true, year: { not: year } },
        data: { isCurrent: false },
      });
    }
    return tx.fiscalYear.update({
      where: { year },
      data: updateData,
      select: fiscalYearSelect,
    });
  });
}

export async function deleteFiscalYear(year: number) {
  const target = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!target) throw new NotFoundError("年度が見つかりません");

  const [assignmentCount, evaluationCount, settingCount, itemCount] = await Promise.all([
    prisma.evaluationAssignment.count({ where: { fiscalYear: year } }),
    prisma.evaluation.count({ where: { fiscalYear: year } }),
    prisma.evaluationSetting.count({ where: { fiscalYear: year } }),
    prisma.fiscalYearItem.count({ where: { fiscalYear: year } }),
  ]);

  if (assignmentCount > 0 || evaluationCount > 0 || settingCount > 0 || itemCount > 0)
    throw new ConflictError("紐づくデータが存在するため削除できません");

  await prisma.fiscalYear.delete({ where: { year } });
}

export async function getFiscalYearItems(year: number) {
  const fiscalYear = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!fiscalYear) throw new NotFoundError("年度が見つかりません");

  const items = await prisma.fiscalYearItem.findMany({
    where: { fiscalYear: year },
    include: {
      evaluationItem: {
        select: { id: true, targetId: true, categoryId: true, no: true, name: true },
      },
    },
    orderBy: { evaluationItem: { no: "asc" } },
  });

  return items.map((i) => i.evaluationItem);
}

export async function addFiscalYearItem(year: number, itemId: number) {
  if (!Number.isInteger(itemId) || itemId < 1)
    throw new BadRequestError("evaluationItemId は正の整数で指定してください");

  const fiscalYear = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!fiscalYear) throw new NotFoundError("年度が見つかりません");

  const item = await prisma.evaluationItem.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError("評価項目が見つかりません");

  const existing = await prisma.fiscalYearItem.findUnique({
    where: { fiscalYear_evaluationItemId: { fiscalYear: year, evaluationItemId: itemId } },
  });
  if (existing) throw new ConflictError("すでに紐づいています");

  return prisma.fiscalYearItem.create({
    data: { fiscalYear: year, evaluationItemId: itemId },
    select: { fiscalYear: true, evaluationItemId: true },
  });
}

export async function removeFiscalYearItem(year: number, itemId: number) {
  if (!Number.isInteger(itemId) || itemId < 1)
    throw new BadRequestError("itemId は正の整数で指定してください");

  const existing = await prisma.fiscalYearItem.findUnique({
    where: { fiscalYear_evaluationItemId: { fiscalYear: year, evaluationItemId: itemId } },
  });
  if (!existing) throw new NotFoundError("紐づきが見つかりません");

  await prisma.fiscalYearItem.delete({
    where: { fiscalYear_evaluationItemId: { fiscalYear: year, evaluationItemId: itemId } },
  });
}
