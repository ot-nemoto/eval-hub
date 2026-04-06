import { redirect } from "next/navigation";
import EvaluationTabs from "@/components/evaluation/EvaluationTabs";
import { getSession } from "@/lib/auth";
import { getCurrentFiscalYear } from "@/lib/fiscal-year";
import { prisma } from "@/lib/prisma";

export default async function EvaluationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = session.user.id;
  const fiscalYear = await getCurrentFiscalYear();
  if (!fiscalYear) redirect("/login");

  const [items, evaluations, setting] = await Promise.all([
    prisma.evaluationItem.findMany({
      orderBy: [{ targetId: "asc" }, { categoryId: "asc" }, { no: "asc" }],
      include: { target: true, category: true },
    }),
    prisma.evaluation.findMany({
      where: { evaluateeId: userId, fiscalYear: fiscalYear },
    }),
    prisma.evaluationSetting.findUnique({
      where: { userId_fiscalYear: { userId: userId, fiscalYear: fiscalYear } },
    }),
  ]);

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

  const evalMap = Object.fromEntries(evaluations.map((e) => [e.evalItemId, e]));

  const itemsWithEval = items.map((item) => {
    const ev = evalMap[item.id];
    return {
      uid: String(item.id),
      name: item.name,
      description: item.description,
      evalCriteria: item.evalCriteria,
      category: item.category.name,
      target: item.target.name,
      selfScore: ev?.selfScore ?? null,
      selfReason: ev?.selfReason ?? null,
      managerScore: ev?.managerScore ?? null,
      managerReason: ev?.managerReason ?? null,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">自己評価</h2>
        <p className="text-sm text-gray-500">{fiscalYear}年度</p>
      </div>
      <EvaluationTabs items={itemsWithEval} userId={userId} fiscalYear={fiscalYear} />
    </div>
  );
}
