import { notFound, redirect } from "next/navigation";
import ManagerEvaluationTabs from "@/components/evaluation/ManagerEvaluationTabs";
import { getSession } from "@/lib/auth";
import { getCurrentFiscalYear } from "@/lib/fiscal-year";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function MemberEvaluationsPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id: evaluateeId } = await params;
  const evaluatorId = session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const fiscalYear = await getCurrentFiscalYear();
  if (!fiscalYear) notFound();

  // 権限確認: admin または当該年度にアサインされた評価者のみアクセス可
  if (!isAdmin) {
    const assignment = await prisma.evaluationAssignment.findUnique({
      where: {
        fiscalYear_evaluateeId_evaluatorId: {
          fiscalYear: fiscalYear,
          evaluateeId: evaluateeId,
          evaluatorId: evaluatorId,
        },
      },
    });
    if (!assignment) notFound();
  }

  const evaluatee = await prisma.user.findUnique({
    where: { id: evaluateeId },
    select: { id: true, name: true },
  });
  if (!evaluatee) notFound();

  const [items, evaluations] = await Promise.all([
    prisma.evaluationItem.findMany({
      orderBy: [{ target: { no: "asc" } }, { category: { no: "asc" } }, { no: "asc" }],
      include: { target: true, category: true },
    }),
    prisma.evaluation.findMany({
      where: { evaluateeId: evaluateeId, fiscalYear: fiscalYear },
    }),
  ]);

  const evalMap = Object.fromEntries(evaluations.map((e) => [e.evalItemId, e]));

  const itemsWithEval = items.map((item) => {
    const ev = evalMap[item.id];
    return {
      id: item.id,
      uid: `${item.target.no}-${item.category.no}-${item.no}`,
      name: item.name,
      description: item.description,
      evalCriteria: item.evalCriteria,
      category: item.category.name,
      target: item.target.name,
      selfScore: (ev?.selfScore ?? null) as "none" | "ka" | "ryo" | "yu" | null,
      selfReason: ev?.selfReason ?? null,
      managerScore: (ev?.managerScore ?? null) as "none" | "ka" | "ryo" | "yu" | null,
      managerReason: ev?.managerReason ?? null,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">{evaluatee.name} の評価入力</h2>
        <p className="text-sm text-gray-500">{fiscalYear}年度</p>
      </div>
      <ManagerEvaluationTabs
        items={itemsWithEval}
        evaluateeId={evaluateeId}
        fiscalYear={fiscalYear}
      />
    </div>
  );
}
