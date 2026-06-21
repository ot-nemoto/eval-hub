import { redirect } from "next/navigation";
import EvaluationTabs from "@/components/evaluation/EvaluationTabs";
import { getSession } from "@/lib/auth";
import { getEvaluations } from "@/lib/evaluations";
import { getCurrentFiscalYear } from "@/lib/fiscal-year";
import { prisma } from "@/lib/prisma";

export default async function EvaluationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = session.user.id;
  const fiscalYear = await getCurrentFiscalYear();
  if (!fiscalYear) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">自己評価</h2>
        </div>
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          年度が設定されていません。管理者にお問い合わせください。
        </div>
      </div>
    );
  }

  const [fiscalYearRecord, evaluations, setting] = await Promise.all([
    prisma.fiscalYear.findUnique({
      where: { year: fiscalYear },
      select: { isLocked: true, evalItemVersionId: true },
    }),
    getEvaluations(userId, fiscalYear),
    prisma.evaluationSetting.findUnique({
      where: { userId_fiscalYear: { userId: userId, fiscalYear: fiscalYear } },
    }),
  ]);
  const isLocked = fiscalYearRecord?.isLocked ?? false;

  const items = fiscalYearRecord?.evalItemVersionId
    ? await prisma.evalItemVersionDetail.findMany({
        where: { versionId: fiscalYearRecord.evalItemVersionId },
        orderBy: [{ targetNo: "asc" }, { categoryNo: "asc" }, { no: "asc" }],
      })
    : [];

  const selfEvaluationEnabled = setting?.selfEvaluationEnabled ?? false;

  if (!selfEvaluationEnabled) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">自己評価</h2>
          <p className="text-sm text-gray-500">{fiscalYear}年度</p>
        </div>
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          {fiscalYear}年度の自己評価は不要に設定されています。
        </div>
      </div>
    );
  }

  const evalMap = Object.fromEntries(evaluations.map((e) => [e.evalItemVersionDetailId, e]));

  const itemsWithEval = items.map((item) => {
    const ev = evalMap[item.id];
    return {
      uid: String(item.id),
      name: item.name,
      description: item.description,
      evalCriteria: item.evalCriteria,
      category: item.categoryName,
      target: item.targetName,
      selfScore: ev?.selfScore ?? null,
      selfReason: ev?.selfReason ?? null,
      managerComments: ev?.managerComments ?? [],
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">自己評価</h2>
        <p className="text-sm text-gray-500">{fiscalYear}年度</p>
      </div>
      <EvaluationTabs items={itemsWithEval} fiscalYear={fiscalYear} isLocked={isLocked} />
    </div>
  );
}
