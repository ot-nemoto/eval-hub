import { redirect } from "next/navigation";
import { FiscalYearActions } from "@/components/admin/FiscalYearActions";
import { FiscalYearForm } from "@/components/admin/FiscalYearForm";
import { FiscalYearVersionSelect } from "@/components/admin/FiscalYearVersionSelect";
import { getSession } from "@/lib/auth";
import { getEvalItemVersions } from "@/lib/eval-item-versions";
import { prisma } from "@/lib/prisma";

export default async function FiscalYearsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  const [fiscalYears, versions] = await Promise.all([
    prisma.fiscalYear.findMany({
      orderBy: { year: "desc" },
      select: {
        year: true,
        name: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
        isLocked: true,
        evalItemVersionId: true,
        _count: {
          select: {
            evaluationSettings: true,
            evaluationAssignments: true,
            evaluations: true,
          },
        },
      },
    }),
    getEvalItemVersions(),
  ]);

  const versionOptions = versions.map((v) => ({ id: v.id, name: v.name }));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">年度管理</h2>
        <p className="text-sm text-gray-500">年度の追加・編集・現在年度の設定を行います。</p>
      </div>

      <div className="mb-6">
        <FiscalYearForm />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">年度</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">名称</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">開始日</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">終了日</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">現在年度</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">状態</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">バージョン</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {fiscalYears.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  年度が登録されていません。
                </td>
              </tr>
            ) : (
              fiscalYears.map((fy) => (
                <tr key={fy.year} className={fy.isCurrent ? "bg-zinc-50" : "hover:bg-gray-50"}>
                  <td className="px-4 py-3 font-medium text-gray-900">{fy.year}</td>
                  <td className="px-4 py-3 text-gray-700">{fy.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {fy.startDate.toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {fy.endDate.toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3">
                    {fy.isCurrent ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        現在
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {fy.isLocked ? (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                        ロック済み
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <FiscalYearVersionSelect
                      year={fy.year}
                      isLocked={fy.isLocked}
                      currentVersionId={fy.evalItemVersionId}
                      versions={versionOptions}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <FiscalYearActions
                      fiscalYear={fy}
                      isDeletable={Object.values(fy._count).every((count) => count === 0)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
