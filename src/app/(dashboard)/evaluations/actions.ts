"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { BadRequestError } from "@/lib/errors";
import { upsertEvaluation } from "@/lib/evaluations";
import { prisma } from "@/lib/prisma";

export async function upsertSelfEvaluationAction(
  fiscalYear: number,
  evalItemId: number,
  data: { selfScore?: string | null; selfReason?: string | null },
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    return { error: "fiscalYear は 1900〜9999 の整数で指定してください" };
  if (!Number.isInteger(evalItemId) || evalItemId < 1)
    return { error: "evalItemId は正の整数で指定してください" };

  const setting = await prisma.evaluationSetting.findUnique({
    where: { userId_fiscalYear: { userId: session.user.id, fiscalYear } },
  });
  if (!setting?.selfEvaluationEnabled)
    return { error: "この年度は自己評価が不要に設定されています" };

  try {
    await upsertEvaluation({
      fiscalYear,
      evaluateeId: session.user.id,
      evalItemId,
      selfScore: data.selfScore,
      selfReason: data.selfReason,
    });
  } catch (e) {
    if (e instanceof BadRequestError) return { error: e.message };
    throw e;
  }

  revalidatePath("/evaluations");
  return {};
}
