import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import EvaluationTabs from "@/components/evaluation/EvaluationTabs";

export default async function EvaluationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = session.user.id;
  const fiscalYear = new Date().getFullYear();

  const [items, evaluations, setting] = await Promise.all([
    prisma.evaluationItem.findMany({
      orderBy: [{ target_no: "asc" }, { category_no: "asc" }, { item_no: "asc" }],
    }),
    prisma.evaluation.findMany({
      where: { evaluatee_id: userId, fiscal_year: fiscalYear },
    }),
    prisma.evaluationSetting.findUnique({
      where: { user_id_fiscal_year: { user_id: userId, fiscal_year: fiscalYear } },
    }),
  ]);

  const selfEvaluationEnabled = setting?.self_evaluation_enabled ?? false;

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

  const evalMap = Object.fromEntries(evaluations.map((e) => [e.eval_uid, e]));

  const itemsWithEval = items.map((item) => {
    const ev = evalMap[item.uid];
    return {
      uid: item.uid,
      name: item.name,
      description: item.description,
      eval_criteria: item.eval_criteria,
      category: item.category,
      target: item.target,
      self_score: (ev?.self_score ?? null) as "none" | "ka" | "ryo" | "yu" | null,
      self_reason: ev?.self_reason ?? null,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">自己評価</h2>
        <p className="text-sm text-gray-500">{fiscalYear}年度</p>
      </div>
      <EvaluationTabs
        items={itemsWithEval}
        userId={userId}
        fiscalYear={fiscalYear}
      />
    </div>
  );
}
