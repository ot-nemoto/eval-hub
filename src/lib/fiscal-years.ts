import { Prisma } from "@prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const fiscalYearSelect = {
  year: true,
  name: true,
  startDate: true,
  endDate: true,
  isCurrent: true,
  isLocked: true,
  evalItemVersionId: true,
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
    select: { year: true, evalItemVersionId: true },
  });

  try {
    return await prisma.fiscalYear.create({
      data: {
        year: data.year,
        name: data.name,
        startDate,
        endDate,
        evalItemVersionId: latestFy?.evalItemVersionId ?? null,
      },
      select: fiscalYearSelect,
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

export async function assertFiscalYearUnlocked(
  fiscalYear: number,
): Promise<{ error: string } | null> {
  const fy = await prisma.fiscalYear.findUnique({
    where: { year: fiscalYear },
    select: { isLocked: true },
  });
  if (fy?.isLocked) return { error: "この年度はロックされているため編集できません" };
  return null;
}

export async function toggleFiscalYearLock(year: number, isLocked: boolean) {
  const target = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!target) throw new NotFoundError("年度が見つかりません");

  return prisma.fiscalYear.update({
    where: { year },
    data: { isLocked },
    select: fiscalYearSelect,
  });
}

export async function deleteFiscalYear(year: number) {
  const target = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!target) throw new NotFoundError("年度が見つかりません");

  const [assignmentCount, evaluationCount, settingCount] = await Promise.all([
    prisma.evaluationAssignment.count({ where: { fiscalYear: year } }),
    prisma.evaluation.count({ where: { fiscalYear: year } }),
    prisma.evaluationSetting.count({ where: { fiscalYear: year } }),
  ]);

  if (assignmentCount > 0 || evaluationCount > 0 || settingCount > 0)
    throw new ConflictError("紐づくデータが存在するため削除できません");

  await prisma.fiscalYear.delete({ where: { year } });
}
