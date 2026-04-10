import type { Score } from "@prisma/client";
import { BadRequestError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function getEvaluationProgress(fiscalYear: number) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");

  const [evaluatees, fiscalYearItems] = await Promise.all([
    prisma.evaluationAssignment.findMany({
      where: { fiscalYear },
      select: { evaluateeId: true, evaluatee: { select: { name: true } } },
      distinct: ["evaluateeId"],
      orderBy: { evaluatee: { name: "asc" } },
    }),
    prisma.fiscalYearItem.findMany({
      where: { fiscalYear },
      select: { evaluationItemId: true },
    }),
  ]);

  const fiscalYearItemIds = fiscalYearItems.map((item) => item.evaluationItemId);
  const totalItems = fiscalYearItemIds.length;
  const evaluations = await prisma.evaluation.findMany({
    where: { fiscalYear, evalItemId: { in: fiscalYearItemIds } },
    select: { evaluateeId: true, selfScore: true, managerScore: true, updatedAt: true },
  });

  // O(N+M): 被評価者 ID をキーにした Map で事前グルーピング
  const evalsByUser = new Map<string, typeof evaluations>();
  for (const e of evaluations) {
    const list = evalsByUser.get(e.evaluateeId) ?? [];
    list.push(e);
    evalsByUser.set(e.evaluateeId, list);
  }

  return evaluatees.map(({ evaluateeId, evaluatee }) => {
    const evals = evalsByUser.get(evaluateeId) ?? [];
    const selfScored = evals.filter((e) => e.selfScore !== null).length;
    const managerScored = evals.filter((e) => e.managerScore !== null).length;
    const lastUpdatedAt =
      evals.length > 0
        ? new Date(Math.max(...evals.map((e) => e.updatedAt.getTime())))
        : null;
    return { evaluateeId, name: evaluatee.name, totalItems, selfScored, managerScored, lastUpdatedAt };
  });
}

export async function getAllManagerEvaluations(
  fiscalYear: number,
  filter?: { userId?: string },
) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");

  const rows = await prisma.evaluation.findMany({
    where: {
      fiscalYear,
      evaluatee: { isActive: true },
      ...(filter?.userId ? { evaluateeId: filter.userId } : {}),
    },
    include: {
      evaluatee: { select: { id: true, name: true } },
      evaluationItem: {
        select: {
          no: true,
          name: true,
          target: { select: { no: true } },
          category: { select: { no: true } },
        },
      },
      managerComments: {
        include: { evaluator: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [
      { evaluatee: { name: "asc" } },
      { evaluationItem: { target: { no: "asc" } } },
      { evaluationItem: { category: { no: "asc" } } },
      { evaluationItem: { no: "asc" } },
    ],
  });

  return rows.map((r) => {
    const latestComment = r.managerComments[0] ?? null;
    return {
      id: r.id,
      evaluatee: r.evaluatee,
      item: {
        uid: `${r.evaluationItem.target.no}-${r.evaluationItem.category.no}-${r.evaluationItem.no}`,
        name: r.evaluationItem.name,
      },
      managerScore: r.managerScore,
      latestComment: latestComment
        ? { reason: latestComment.reason, evaluatorName: latestComment.evaluator.name }
        : null,
      updatedAt: r.updatedAt,
    };
  });
}

export async function getAllSelfEvaluations(
  fiscalYear: number,
  filter?: { userId?: string },
) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");

  const rows = await prisma.evaluation.findMany({
    where: {
      fiscalYear,
      evaluatee: { isActive: true },
      ...(filter?.userId ? { evaluateeId: filter.userId } : {}),
    },
    include: {
      evaluatee: { select: { id: true, name: true } },
      evaluationItem: {
        select: {
          no: true,
          name: true,
          target: { select: { no: true } },
          category: { select: { no: true } },
        },
      },
    },
    orderBy: [
      { evaluatee: { name: "asc" } },
      { evaluationItem: { target: { no: "asc" } } },
      { evaluationItem: { category: { no: "asc" } } },
      { evaluationItem: { no: "asc" } },
    ],
  });

  return rows.map((r) => ({
    id: r.id,
    evaluatee: r.evaluatee,
    item: {
      uid: `${r.evaluationItem.target.no}-${r.evaluationItem.category.no}-${r.evaluationItem.no}`,
      name: r.evaluationItem.name,
    },
    selfScore: r.selfScore,
    selfReason: r.selfReason,
    updatedAt: r.updatedAt,
  }));
}

export async function getEvaluations(evaluateeId: string, fiscalYear: number) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");

  const evaluations = await prisma.evaluation.findMany({
    where: { fiscalYear, evaluateeId },
    include: {
      evaluationItem: { select: { name: true } },
      managerComments: {
        include: { evaluator: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { evalItemId: "asc" },
  });

  return evaluations.map((e) => ({
    evalItemId: e.evalItemId,
    evaluationId: e.id,
    itemName: e.evaluationItem.name,
    selfScore: e.selfScore,
    selfReason: e.selfReason,
    managerScore: e.managerScore,
    managerComments: e.managerComments.map((c) => ({
      id: c.id,
      evaluatorId: c.evaluatorId,
      evaluatorName: c.evaluator.name,
      reason: c.reason,
      createdAt: c.createdAt,
    })),
  }));
}

export async function upsertEvaluation(data: {
  fiscalYear: number;
  evaluateeId: string;
  evalItemId: number;
  selfScore?: Score | null;
  selfReason?: string | null;
}) {
  if (!Number.isInteger(data.fiscalYear) || data.fiscalYear < 1900 || data.fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");
  if (!Number.isInteger(data.evalItemId) || data.evalItemId < 1)
    throw new BadRequestError("evalItemId は正の整数で指定してください");

  const { fiscalYear, evaluateeId, evalItemId, ...fields } = data;

  const evaluation = await prisma.evaluation.upsert({
    where: {
      fiscalYear_evaluateeId_evalItemId: { fiscalYear, evaluateeId, evalItemId },
    },
    create: { fiscalYear, evaluateeId, evalItemId, ...fields },
    update: fields,
  });

  return {
    evalItemId: evaluation.evalItemId,
    selfScore: evaluation.selfScore,
    selfReason: evaluation.selfReason,
  };
}

export async function upsertManagerScore(
  evaluateeId: string,
  fiscalYear: number,
  evalItemId: number,
  managerScore: Score | null,
) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");
  if (!Number.isInteger(evalItemId) || evalItemId < 1)
    throw new BadRequestError("evalItemId は正の整数で指定してください");

  const evaluation = await prisma.evaluation.upsert({
    where: {
      fiscalYear_evaluateeId_evalItemId: { fiscalYear, evaluateeId, evalItemId },
    },
    create: { fiscalYear, evaluateeId, evalItemId, managerScore },
    update: { managerScore },
  });

  return { evalItemId: evaluation.evalItemId, managerScore: evaluation.managerScore };
}

export async function addManagerComment(
  evaluateeId: string,
  fiscalYear: number,
  evalItemId: number,
  evaluatorId: string,
  data: { reason: string | null },
) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");
  if (!Number.isInteger(evalItemId) || evalItemId < 1)
    throw new BadRequestError("evalItemId は正の整数で指定してください");

  // evaluation が存在しなければ作成する
  const evaluation = await prisma.evaluation.upsert({
    where: {
      fiscalYear_evaluateeId_evalItemId: { fiscalYear, evaluateeId, evalItemId },
    },
    create: { fiscalYear, evaluateeId, evalItemId },
    update: {},
  });

  return prisma.managerComment.create({
    data: {
      evaluationId: evaluation.id,
      evaluatorId,
      reason: data.reason,
    },
  });
}

export async function updateManagerComment(
  commentId: string,
  data: { reason?: string | null },
) {
  return prisma.managerComment.update({
    where: { id: commentId },
    data,
  });
}

export async function deleteManagerComment(commentId: string) {
  await prisma.managerComment.delete({ where: { id: commentId } });
}
