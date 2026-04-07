import { Prisma } from "@prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function getEvaluationAssignments(filter?: {
  fiscalYear?: number;
  evaluateeId?: string;
}) {
  if (filter?.fiscalYear !== undefined) {
    if (!Number.isInteger(filter.fiscalYear) || filter.fiscalYear < 1900 || filter.fiscalYear > 9999)
      throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");
  }

  const where: Prisma.EvaluationAssignmentWhereInput = {};
  if (filter?.fiscalYear !== undefined) where.fiscalYear = filter.fiscalYear;
  if (filter?.evaluateeId !== undefined) where.evaluateeId = filter.evaluateeId;

  const assignments = await prisma.evaluationAssignment.findMany({
    where,
    include: {
      evaluatee: { select: { id: true, name: true } },
      evaluator: { select: { id: true, name: true } },
    },
    orderBy: [{ fiscalYear: "desc" }, { evaluateeId: "asc" }],
  });

  return assignments.map((a) => ({
    id: a.id,
    fiscalYear: a.fiscalYear,
    evaluatee: a.evaluatee,
    evaluator: a.evaluator,
  }));
}

export async function createEvaluationAssignment(data: {
  fiscalYear: number;
  evaluateeId: string;
  evaluatorId: string;
}) {
  if (!Number.isInteger(data.fiscalYear) || data.fiscalYear < 1900 || data.fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");
  if (!data.evaluateeId) throw new BadRequestError("evaluateeId は必須です");
  if (!data.evaluatorId) throw new BadRequestError("evaluatorId は必須です");

  const existing = await prisma.evaluationAssignment.findUnique({
    where: {
      fiscalYear_evaluateeId_evaluatorId: {
        fiscalYear: data.fiscalYear,
        evaluateeId: data.evaluateeId,
        evaluatorId: data.evaluatorId,
      },
    },
  });
  if (existing) throw new ConflictError("同一年度・被評価者・評価者の組み合わせがすでに存在します");

  try {
    return await prisma.evaluationAssignment.create({ data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new ConflictError("同一年度・被評価者・評価者の組み合わせがすでに存在します");
    throw e;
  }
}

export async function deleteEvaluationAssignment(id: string) {
  const existing = await prisma.evaluationAssignment.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("アサインが見つかりません");

  await prisma.evaluationAssignment.delete({ where: { id } });
}
