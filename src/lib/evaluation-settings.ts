import { BadRequestError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function getEvaluationSettings(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("ユーザーが見つかりません");

  const settings = await prisma.evaluationSetting.findMany({
    where: { userId },
    orderBy: { fiscalYear: "desc" },
  });

  return settings.map((s) => ({
    fiscalYear: s.fiscalYear,
    selfEvaluationEnabled: s.selfEvaluationEnabled,
  }));
}

export async function upsertEvaluationSetting(
  userId: string,
  fiscalYear: number,
  data: { selfEvaluationEnabled: boolean },
) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 9999)
    throw new BadRequestError("fiscalYear は 1900〜9999 の整数で指定してください");

  if (typeof data.selfEvaluationEnabled !== "boolean")
    throw new BadRequestError("selfEvaluationEnabled は boolean で指定してください");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("ユーザーが見つかりません");

  const setting = await prisma.evaluationSetting.upsert({
    where: { userId_fiscalYear: { userId, fiscalYear } },
    update: { selfEvaluationEnabled: data.selfEvaluationEnabled },
    create: { userId, fiscalYear, selfEvaluationEnabled: data.selfEvaluationEnabled },
  });

  return {
    fiscalYear: setting.fiscalYear,
    selfEvaluationEnabled: setting.selfEvaluationEnabled,
  };
}
