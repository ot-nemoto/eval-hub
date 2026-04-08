import { redirect } from "next/navigation";

import { EvaluationAssignmentActions } from "@/components/admin/EvaluationAssignmentActions";
import { EvaluationAssignmentForm } from "@/components/admin/EvaluationAssignmentForm";
import { EvaluationAssignmentYearSelector } from "@/components/admin/EvaluationAssignmentYearSelector";
import { getSession } from "@/lib/auth";
import { getEvaluationAssignments } from "@/lib/evaluation-assignments";
import { getFiscalYears } from "@/lib/fiscal-years";
import { prisma } from "@/lib/prisma";

export default async function EvaluationAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  const { year: yearParam } = await searchParams;

  const fiscalYears = await getFiscalYears();
  const currentFiscalYear =
    fiscalYears.find((fy) => fy.isCurrent) ?? fiscalYears[0] ?? null;

  const parsedYear = yearParam !== undefined ? Number(yearParam) : null;
  const selectedYear =
    parsedYear !== null && Number.isInteger(parsedYear)
      ? parsedYear
      : (currentFiscalYear?.year ?? null);

  const [assignments, activeUsers, evaluateeIdsWithEvals] = await Promise.all([
    selectedYear !== null ? getEvaluationAssignments({ fiscalYear: selectedYear }) : [],
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    selectedYear !== null
      ? prisma.evaluation
          .findMany({
            where: { fiscalYear: selectedYear },
            select: { evaluateeId: true },
            distinct: ["evaluateeId"],
          })
          .then((rows) => new Set(rows.map((r) => r.evaluateeId)))
      : new Set<string>(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">評価者アサイン管理</h2>
        <p className="text-sm text-gray-500">
          年度ごとに被評価者と評価者の組み合わせを管理します。
        </p>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <EvaluationAssignmentYearSelector
          fiscalYears={fiscalYears.map((fy) => ({ year: fy.year, name: fy.name }))}
          selectedYear={selectedYear}
        />
      </div>

      {selectedYear !== null && (
        <div className="mb-6">
          <EvaluationAssignmentForm fiscalYear={selectedYear} users={activeUsers} />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">年度</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">被評価者</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">評価者</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  {selectedYear !== null
                    ? "アサインが登録されていません。"
                    : "年度を選択してください。"}
                </td>
              </tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{a.fiscalYear}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{a.evaluatee.name}</td>
                  <td className="px-4 py-3 text-gray-700">{a.evaluator.name}</td>
                  <td className="px-4 py-3 text-right">
                    <EvaluationAssignmentActions
                      id={a.id}
                      hasEvaluations={evaluateeIdsWithEvals.has(a.evaluatee.id)}
                      label={`${a.evaluatee.name} ← ${a.evaluator.name}`}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {assignments.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">{assignments.length} 件</p>
      )}
    </div>
  );
}
