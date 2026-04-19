import { notFound, redirect } from "next/navigation";
import ManagerEvaluationTabs from "@/components/evaluation/ManagerEvaluationTabs";
import { getSession } from "@/lib/auth";
import { getCurrentFiscalYear } from "@/lib/fiscal-year";
import { getEvaluations } from "@/lib/evaluations";
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

  // 対象ユーザーが当該年度の被評価者として存在するか確認
  const isEvaluatee = await prisma.evaluationAssignment.findFirst({
    where: { fiscalYear, evaluateeId },
  });
  if (!isEvaluatee) notFound();

  // 評価者アサインの確認（なければ読み取り専用）
  let isAssigned = isAdmin;
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
    isAssigned = !!assignment;
  }
  const readOnly = !isAssigned;

  const evaluatee = await prisma.user.findUnique({
    where: { id: evaluateeId },
    select: { id: true, name: true },
  });
  if (!evaluatee) notFound();

  const [items, evaluations, fiscalYearRecord] = await Promise.all([
    prisma.evaluationItem.findMany({
      where: { fiscalYearItems: { some: { fiscalYear: fiscalYear } } },
      orderBy: [{ target: { no: "asc" } }, { category: { no: "asc" } }, { no: "asc" }],
      include: { target: true, category: true },
    }),
    getEvaluations(evaluateeId, fiscalYear),
    prisma.fiscalYear.findUnique({
      where: { year: fiscalYear },
      select: { isLocked: true },
    }),
  ]);
  const isLocked = fiscalYearRecord?.isLocked ?? false;

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
      selfScore: (ev?.selfScore ?? null) as "none" | "ka" | "ryo" | "yu" | null,
      selfReason: ev?.selfReason ?? null,
      managerScore: (ev?.managerScore ?? null) as "none" | "ka" | "ryo" | "yu" | null,
      evaluationId: ev?.evaluationId ?? null,
      managerComments: ev?.managerComments ?? [],
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {evaluatee.name} の{readOnly || isLocked ? "評価参照" : "評価入力"}
        </h2>
        <p className="text-sm text-gray-500">{fiscalYear}年度</p>
      </div>
      <ManagerEvaluationTabs
        items={itemsWithEval}
        evaluateeId={evaluateeId}
        fiscalYear={fiscalYear}
        currentUserId={session.user.id}
        isAdmin={isAdmin}
        readOnly={readOnly}
        isLocked={isLocked}
      />
    </div>
  );
}
