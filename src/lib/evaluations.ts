import type { ManagerComment, Score } from "@prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { assertFiscalYearUnlocked } from "@/lib/fiscal-years";
import { prisma } from "@/lib/prisma";

/** 評価者コメントを明示 projection で返す（将来の列追加による無言の漏れを防ぐ）。 */
function serializeComment(c: ManagerComment) {
  return {
    id: c.id,
    evaluationId: c.evaluationId,
    evaluatorId: c.evaluatorId,
    score: c.score,
    reason: c.reason,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export async function getEvaluationProgress(fiscalYear: number) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");

  const [evaluatees, fy] = await Promise.all([
    prisma.evaluationAssignment.findMany({
      where: { fiscalYear },
      select: { evaluateeId: true, evaluatee: { select: { name: true } } },
      distinct: ["evaluateeId"],
      orderBy: { evaluatee: { name: "asc" } },
    }),
    prisma.fiscalYear.findUnique({
      where: { year: fiscalYear },
      select: { evalItemVersionId: true },
    }),
  ]);

  const versionDetails = fy?.evalItemVersionId
    ? await prisma.evalItemVersionDetail.findMany({
        where: { versionId: fy.evalItemVersionId },
        select: { id: true },
      })
    : [];

  const versionDetailIds = versionDetails.map((d) => d.id);
  const totalItems = versionDetailIds.length;
  const evaluations = await prisma.evaluation.findMany({
    where: { fiscalYear, evalItemVersionDetailId: { in: versionDetailIds } },
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
      evals.length > 0 ? new Date(Math.max(...evals.map((e) => e.updatedAt.getTime()))) : null;
    return {
      evaluateeId,
      name: evaluatee.name,
      totalItems,
      selfScored,
      managerScored,
      lastUpdatedAt,
    };
  });
}

export async function getAllManagerEvaluations(fiscalYear: number, filter?: { userId?: string }) {
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
      evalItemVersionDetail: {
        select: {
          no: true,
          name: true,
          targetNo: true,
          categoryNo: true,
        },
      },
      managerComments: {
        select: { reason: true, evaluator: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [
      { evaluatee: { name: "asc" } },
      { evalItemVersionDetail: { targetIndex: "asc" } },
      { evalItemVersionDetail: { categoryIndex: "asc" } },
      { evalItemVersionDetail: { index: "asc" } },
    ],
  });

  return rows.map((r) => {
    const latestComment = r.managerComments[0] ?? null;
    return {
      id: r.id,
      evaluatee: r.evaluatee,
      item: {
        uid: `${r.evalItemVersionDetail.targetNo}-${r.evalItemVersionDetail.categoryNo}-${r.evalItemVersionDetail.no}`,
        name: r.evalItemVersionDetail.name,
      },
      managerScore: r.managerScore,
      latestComment: latestComment
        ? { reason: latestComment.reason, evaluatorName: latestComment.evaluator.name }
        : null,
      updatedAt: r.updatedAt,
    };
  });
}

export async function getAllSelfEvaluations(fiscalYear: number, filter?: { userId?: string }) {
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
      evalItemVersionDetail: {
        select: {
          no: true,
          name: true,
          targetNo: true,
          categoryNo: true,
        },
      },
    },
    orderBy: [
      { evaluatee: { name: "asc" } },
      { evalItemVersionDetail: { targetIndex: "asc" } },
      { evalItemVersionDetail: { categoryIndex: "asc" } },
      { evalItemVersionDetail: { index: "asc" } },
    ],
  });

  return rows.map((r) => ({
    id: r.id,
    evaluatee: r.evaluatee,
    item: {
      uid: `${r.evalItemVersionDetail.targetNo}-${r.evalItemVersionDetail.categoryNo}-${r.evalItemVersionDetail.no}`,
      name: r.evalItemVersionDetail.name,
    },
    selfScore: r.selfScore,
    selfReason: r.selfReason,
    updatedAt: r.updatedAt,
  }));
}

export async function getEvaluationMatrix(fiscalYear: number) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");

  const fy = await prisma.fiscalYear.findUnique({
    where: { year: fiscalYear },
    select: { evalItemVersionId: true },
  });

  const [users, items] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    fy?.evalItemVersionId
      ? prisma.evalItemVersionDetail.findMany({
          where: { versionId: fy.evalItemVersionId },
          select: {
            id: true,
            no: true,
            name: true,
            targetNo: true,
            categoryNo: true,
          },
          orderBy: [{ targetIndex: "asc" }, { categoryIndex: "asc" }, { index: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const evaluations = await prisma.evaluation.findMany({
    where: {
      fiscalYear,
      evaluatee: { isActive: true },
      evalItemVersionDetailId: { in: items.map((i) => i.id) },
    },
    select: {
      evaluateeId: true,
      evalItemVersionDetailId: true,
      selfScore: true,
      managerScore: true,
    },
  });

  const scoreMap = new Map<string, { selfScore: Score | null; managerScore: Score | null }>();
  for (const e of evaluations) {
    scoreMap.set(`${e.evaluateeId}:${e.evalItemVersionDetailId}`, {
      selfScore: e.selfScore,
      managerScore: e.managerScore,
    });
  }

  const rows = items.map((item) => ({
    uid: `${item.targetNo}-${item.categoryNo}-${item.no}`,
    name: item.name,
    scores: users.map((user) => {
      const key = `${user.id}:${item.id}`;
      const entry = scoreMap.get(key);
      return {
        selfScore: entry?.selfScore ?? null,
        managerScore: entry?.managerScore ?? null,
      };
    }),
  }));

  return { users, rows };
}

export async function getEvaluations(evaluateeId: string, fiscalYear: number) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");

  const evaluations = await prisma.evaluation.findMany({
    where: { fiscalYear, evaluateeId },
    include: {
      evalItemVersionDetail: { select: { name: true } },
      managerComments: {
        include: { evaluator: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { evalItemVersionDetailId: "asc" },
  });

  return evaluations.map((e) => ({
    evalItemVersionDetailId: e.evalItemVersionDetailId,
    evaluationId: e.id,
    itemName: e.evalItemVersionDetail.name,
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

/**
 * ロック中の年度への書き込みを拒否する。Server Actions は lib を呼ぶ前に自前で判定しているが、
 * 外部 REST API は判定せずに lib を呼ぶため、書き込み関数の側で必ず判定する（T243）。
 */
async function assertUnlocked(fiscalYear: number) {
  const lockError = await assertFiscalYearUnlocked(fiscalYear);
  if (lockError) throw new ConflictError(lockError.error);
}

/** コメントが属する評価の年度で、ロック中なら拒否する。 */
async function assertCommentUnlocked(commentId: string) {
  const comment = await prisma.managerComment.findUnique({
    where: { id: commentId },
    select: { evaluation: { select: { fiscalYear: true } } },
  });
  if (!comment) throw new NotFoundError("コメントが見つかりません");
  await assertUnlocked(comment.evaluation.fiscalYear);
}

export async function upsertEvaluation(data: {
  fiscalYear: number;
  evaluateeId: string;
  evalItemVersionDetailId: number;
  selfScore?: Score | null;
  selfReason?: string | null;
}) {
  if (!Number.isInteger(data.fiscalYear) || data.fiscalYear < 1900 || data.fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");
  if (!Number.isInteger(data.evalItemVersionDetailId) || data.evalItemVersionDetailId < 1)
    throw new BadRequestError("evalItemVersionDetailId は正の整数で指定してください");

  const { fiscalYear, evaluateeId, evalItemVersionDetailId, ...fields } = data;
  await assertUnlocked(fiscalYear);

  const evaluation = await prisma.evaluation.upsert({
    where: {
      fiscalYear_evaluateeId_evalItemVersionDetailId: {
        fiscalYear,
        evaluateeId,
        evalItemVersionDetailId,
      },
    },
    create: { fiscalYear, evaluateeId, evalItemVersionDetailId, ...fields },
    update: fields,
  });

  return {
    evalItemVersionDetailId: evaluation.evalItemVersionDetailId,
    selfScore: evaluation.selfScore,
    selfReason: evaluation.selfReason,
  };
}

export async function upsertManagerScore(
  evaluateeId: string,
  fiscalYear: number,
  evalItemVersionDetailId: number,
  managerScore: Score | null,
) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");
  if (!Number.isInteger(evalItemVersionDetailId) || evalItemVersionDetailId < 1)
    throw new BadRequestError("evalItemVersionDetailId は正の整数で指定してください");
  await assertUnlocked(fiscalYear);

  const evaluation = await prisma.evaluation.upsert({
    where: {
      fiscalYear_evaluateeId_evalItemVersionDetailId: {
        fiscalYear,
        evaluateeId,
        evalItemVersionDetailId,
      },
    },
    create: { fiscalYear, evaluateeId, evalItemVersionDetailId, managerScore },
    update: { managerScore },
  });

  return {
    evalItemVersionDetailId: evaluation.evalItemVersionDetailId,
    managerScore: evaluation.managerScore,
  };
}

export async function addManagerComment(
  evaluateeId: string,
  fiscalYear: number,
  evalItemVersionDetailId: number,
  evaluatorId: string,
  data: { reason: string | null },
) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");
  if (!Number.isInteger(evalItemVersionDetailId) || evalItemVersionDetailId < 1)
    throw new BadRequestError("evalItemVersionDetailId は正の整数で指定してください");
  await assertUnlocked(fiscalYear);

  const evaluation = await prisma.evaluation.upsert({
    where: {
      fiscalYear_evaluateeId_evalItemVersionDetailId: {
        fiscalYear,
        evaluateeId,
        evalItemVersionDetailId,
      },
    },
    create: { fiscalYear, evaluateeId, evalItemVersionDetailId },
    update: {},
  });

  const comment = await prisma.managerComment.create({
    data: {
      evaluationId: evaluation.id,
      evaluatorId,
      reason: data.reason,
    },
  });
  return serializeComment(comment);
}

export async function updateManagerComment(commentId: string, data: { reason?: string | null }) {
  await assertCommentUnlocked(commentId);
  const comment = await prisma.managerComment.update({
    where: { id: commentId },
    data,
  });
  return serializeComment(comment);
}

export async function deleteManagerComment(commentId: string) {
  await assertCommentUnlocked(commentId);
  await prisma.managerComment.delete({ where: { id: commentId } });
}
