import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function getEvalItemVersions() {
  return prisma.evalItemVersion.findMany({
    orderBy: { id: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { details: true, fiscalYears: true } },
    },
  });
}

export async function getEvalItemVersionDetails(versionId: number) {
  const version = await prisma.evalItemVersion.findUnique({ where: { id: versionId } });
  if (!version) throw new NotFoundError("バージョンが見つかりません");

  return prisma.evalItemVersionDetail.findMany({
    where: { versionId },
    select: {
      id: true,
      evaluationItemId: true,
      targetId: true,
      categoryId: true,
      no: true,
      name: true,
      description: true,
      evalCriteria: true,
      index: true,
      targetNo: true,
      targetName: true,
      targetIndex: true,
      categoryNo: true,
      categoryName: true,
      categoryIndex: true,
    },
    orderBy: [{ targetIndex: "asc" }, { categoryIndex: "asc" }, { index: "asc" }],
  });
}

export async function createEvalItemVersion(name: string) {
  if (!name.trim()) throw new BadRequestError("name は必須です");

  const items = await prisma.evaluationItem.findMany({
    include: {
      target: { select: { no: true, name: true, index: true } },
      category: { select: { no: true, name: true, index: true } },
    },
  });

  if (items.length === 0) throw new BadRequestError("評価項目が存在しません");

  return prisma.evalItemVersion.create({
    data: {
      name: name.trim(),
      details: {
        createMany: {
          data: items.map((item) => ({
            evaluationItemId: item.id,
            targetId: item.targetId,
            categoryId: item.categoryId,
            no: item.no,
            name: item.name,
            description: item.description,
            evalCriteria: item.evalCriteria,
            index: item.index,
            targetNo: item.target.no,
            targetName: item.target.name,
            targetIndex: item.target.index,
            categoryNo: item.category.no,
            categoryName: item.category.name,
            categoryIndex: item.category.index,
          })),
        },
      },
    },
    select: { id: true, name: true, createdAt: true },
  });
}

export async function restoreEvalItemVersion(versionId: number) {
  const version = await prisma.evalItemVersion.findUnique({
    where: { id: versionId },
    include: {
      details: {
        select: {
          evaluationItemId: true,
          targetId: true,
          categoryId: true,
          no: true,
          name: true,
          description: true,
          evalCriteria: true,
          index: true,
          targetNo: true,
          targetName: true,
          targetIndex: true,
          categoryNo: true,
          categoryName: true,
          categoryIndex: true,
        },
      },
    },
  });
  if (!version) throw new NotFoundError("バージョンが見つかりません");
  if (version.details.length === 0) throw new BadRequestError("バージョンに詳細がありません");

  const targetsMap = new Map<number, { no: number; name: string; index: number }>();
  const categoriesMap = new Map<
    number,
    { targetId: number; no: number; name: string; index: number }
  >();
  for (const d of version.details) {
    if (!targetsMap.has(d.targetId)) {
      targetsMap.set(d.targetId, { no: d.targetNo, name: d.targetName, index: d.targetIndex });
    }
    if (!categoriesMap.has(d.categoryId)) {
      categoriesMap.set(d.categoryId, {
        targetId: d.targetId,
        no: d.categoryNo,
        name: d.categoryName,
        index: d.categoryIndex,
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    // 全消し（FK順: 評価項目→中分類→大分類）
    await tx.evaluationItem.deleteMany({});
    await tx.category.deleteMany({});
    await tx.target.deleteMany({});

    // 再挿入（大分類→中分類→評価項目）
    for (const [id, data] of targetsMap) {
      await tx.$executeRawUnsafe(
        `INSERT INTO "targets" ("id", "no", "name", "index") VALUES ($1, $2, $3, $4)`,
        id,
        data.no,
        data.name,
        data.index,
      );
    }

    for (const [id, data] of categoriesMap) {
      await tx.$executeRawUnsafe(
        `INSERT INTO "categories" ("id", "target_id", "no", "name", "index") VALUES ($1, $2, $3, $4, $5)`,
        id,
        data.targetId,
        data.no,
        data.name,
        data.index,
      );
    }

    for (const detail of version.details) {
      await tx.$executeRawUnsafe(
        `INSERT INTO "evaluation_items" ("id", "target_id", "category_id", "no", "name", "description", "eval_criteria", "index") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        detail.evaluationItemId,
        detail.targetId,
        detail.categoryId,
        detail.no,
        detail.name,
        detail.description,
        detail.evalCriteria,
        detail.index,
      );
    }

    // SERIAL シーケンスを max(id) に同期
    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"targets"', 'id'), COALESCE(MAX(id), 1)) FROM "targets"`,
    );
    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"categories"', 'id'), COALESCE(MAX(id), 1)) FROM "categories"`,
    );
    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"evaluation_items"', 'id'), COALESCE(MAX(id), 1)) FROM "evaluation_items"`,
    );
  });
}

export async function deleteEvalItemVersion(versionId: number) {
  const version = await prisma.evalItemVersion.findUnique({
    where: { id: versionId },
    include: { _count: { select: { fiscalYears: true } } },
  });
  if (!version) throw new NotFoundError("バージョンが見つかりません");
  if (version._count.fiscalYears > 0)
    throw new ConflictError("年度に割り当て中のバージョンは削除できません");

  await prisma.$transaction([
    prisma.evalItemVersionDetail.deleteMany({ where: { versionId } }),
    prisma.evalItemVersion.delete({ where: { id: versionId } }),
  ]);
}

export async function assignVersionToFiscalYear(year: number, versionId: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 9999)
    throw new BadRequestError("year は 1900〜9999 の整数で指定してください");
  if (!Number.isInteger(versionId) || versionId < 1)
    throw new BadRequestError("versionId は正の整数で指定してください");

  const fiscalYear = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!fiscalYear) throw new NotFoundError("年度が見つかりません");

  if (fiscalYear.isLocked) throw new ConflictError("この年度はロックされているため編集できません");

  const version = await prisma.evalItemVersion.findUnique({ where: { id: versionId } });
  if (!version) throw new NotFoundError("バージョンが見つかりません");

  return prisma.fiscalYear.update({
    where: { year },
    data: { evalItemVersionId: versionId },
    select: { year: true, evalItemVersionId: true },
  });
}

export async function unassignVersionFromFiscalYear(year: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 9999)
    throw new BadRequestError("year は 1900〜9999 の整数で指定してください");

  const fiscalYear = await prisma.fiscalYear.findUnique({ where: { year } });
  if (!fiscalYear) throw new NotFoundError("年度が見つかりません");

  if (fiscalYear.isLocked) throw new ConflictError("この年度はロックされているため編集できません");

  return prisma.fiscalYear.update({
    where: { year },
    data: { evalItemVersionId: null },
    select: { year: true, evalItemVersionId: true },
  });
}
