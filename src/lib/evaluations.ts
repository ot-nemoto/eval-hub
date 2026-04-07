import { Score } from "@prisma/client";
import { BadRequestError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function getEvaluations(evaluateeId: string, fiscalYear: number) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");

  const evaluations = await prisma.evaluation.findMany({
    where: { fiscalYear, evaluateeId },
    include: { evaluationItem: { select: { name: true } } },
    orderBy: { evalItemId: "asc" },
  });

  return evaluations.map((e) => ({
    eval_item_id: e.evalItemId,
    item_name: e.evaluationItem.name,
    self_score: e.selfScore,
    self_reason: e.selfReason,
    manager_score: e.managerScore,
    manager_reason: e.managerReason,
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
    eval_item_id: evaluation.evalItemId,
    self_score: evaluation.selfScore,
    self_reason: evaluation.selfReason,
    manager_score: evaluation.managerScore,
    manager_reason: evaluation.managerReason,
  };
}
