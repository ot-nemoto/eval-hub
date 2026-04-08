"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Score } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { BadRequestError, ForbiddenError } from "@/lib/errors";
import { upsertEvaluation } from "@/lib/evaluations";
import { prisma } from "@/lib/prisma";

export async function upsertManagerEvaluationAction(
  evaluateeId: string,
  fiscalYear: number,
  evalItemId: number,
  data: { managerScore?: Score | null; managerReason?: string | null },
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    return { error: "fiscalYear は 1900〜9999 の整数で指定してください" };
  if (!Number.isInteger(evalItemId) || evalItemId < 1)
    return { error: "evalItemId は正の整数で指定してください" };

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    const assignment = await prisma.evaluationAssignment.findUnique({
      where: {
        fiscalYear_evaluateeId_evaluatorId: {
          fiscalYear,
          evaluateeId,
          evaluatorId: session.user.id,
        },
      },
    });
    if (!assignment)
      return { error: "評価者としてアサインされていません" };
  }

  try {
    await upsertEvaluation({
      fiscalYear,
      evaluateeId,
      evalItemId,
      managerScore: data.managerScore,
      managerReason: data.managerReason,
    });
  } catch (e) {
    if (e instanceof BadRequestError || e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }

  revalidatePath(`/members/${evaluateeId}/evaluations`);
  return {};
}
