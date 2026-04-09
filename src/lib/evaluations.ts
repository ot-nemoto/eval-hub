import type { Score } from "@prisma/client";
import { BadRequestError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

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
    include: { evaluationItem: { select: { name: true } } },
    orderBy: { evalItemId: "asc" },
  });

  return evaluations.map((e) => ({
    evalItemId: e.evalItemId,
    itemName: e.evaluationItem.name,
    selfScore: e.selfScore,
    selfReason: e.selfReason,
    managerScore: e.managerScore,
    managerReason: e.managerReason,
  }));
}

export async function upsertEvaluation(data: {
  fiscalYear: number;
  evaluateeId: string;
  evalItemId: number;
  selfScore?: Score | null;
  selfReason?: string | null;
  managerScore?: Score | null;
  managerReason?: string | null;
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
    managerScore: evaluation.managerScore,
    managerReason: evaluation.managerReason,
  };
}
