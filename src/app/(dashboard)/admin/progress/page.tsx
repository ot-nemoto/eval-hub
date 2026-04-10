import { redirect } from "next/navigation";

import { AdminYearSelector } from "@/components/admin/AdminYearSelector";
import { getSession } from "@/lib/auth";
import { getEvaluationProgress } from "@/lib/evaluations";
import { getFiscalYears } from "@/lib/fiscal-years";

export default async function AdminProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  const { year: yearParam } = await searchParams;

  const fiscalYears = await getFiscalYears();
  const currentFiscalYear = fiscalYears.find((fy) => fy.isCurrent) ?? fiscalYears[0] ?? null;

  const parsedYear = yearParam !== undefined ? Number(yearParam) : null;
  const selectedYear =
    parsedYear !== null &&
    Number.isInteger(parsedYear) &&
    parsedYear >= 1900 &&
    parsedYear <= 9999
      ? parsedYear
      : (currentFiscalYear?.year ?? null);

  const rows = selectedYear !== null ? await getEvaluationProgress(selectedYear) : [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">評価進捗ダッシュボード</h2>
        <p className="text-sm text-gray-500">全ユーザーの評価入力状況を確認できます。</p>
      </div>

      <div className="mb-4">
        <AdminYearSelector
          basePath="/admin/progress"
          fiscalYears={fiscalYears.map((fy) => ({ year: fy.year, name: fy.name }))}
          selectedYear={selectedYear}
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">社員名</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">自己評価 進捗</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">上長評価 進捗</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">最終更新日</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  {selectedYear !== null
                    ? "評価データがありません。"
                    : "年度を選択してください。"}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const selfPct =
                  row.totalItems > 0
                    ? Math.round((row.selfScored / row.totalItems) * 100)
                    : 0;
                const managerPct =
                  row.totalItems > 0
                    ? Math.round((row.managerScored / row.totalItems) * 100)
                    : 0;
                return (
                  <tr key={row.evaluateeId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <ProgressCell scored={row.selfScored} total={row.totalItems} pct={selfPct} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <ProgressCell scored={row.managerScored} total={row.totalItems} pct={managerPct} />
                    </td>
                    <td className="px-4 py-3 text-gray-500" suppressHydrationWarning>
                      {row.lastUpdatedAt
                        ? row.lastUpdatedAt.toLocaleString("ja-JP")
                        : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">{rows.length} 件</p>
      )}
    </div>
  );
}

function ProgressCell({ scored, total, pct }: { scored: number; total: number; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="tabular-nums">
        {scored} / {total}
      </span>
      <span
        className={`text-xs font-medium ${
          pct === 100 ? "text-green-600" : pct > 0 ? "text-yellow-600" : "text-gray-400"
        }`}
      >
        ({pct}%)
      </span>
    </div>
  );
}
