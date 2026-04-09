import { redirect } from "next/navigation";

import { AdminUserFilter } from "@/components/admin/AdminUserFilter";
import { AdminYearSelector } from "@/components/admin/AdminYearSelector";
import { getSession } from "@/lib/auth";
import { getAllSelfEvaluations } from "@/lib/evaluations";
import { getFiscalYears } from "@/lib/fiscal-years";
import { prisma } from "@/lib/prisma";

const SCORE_LABEL: Record<string, string> = {
  none: "なし",
  ka: "可",
  ryo: "良",
  yu: "優",
};

export default async function AdminSelfEvaluationsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; userId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  const { year: yearParam, userId } = await searchParams;

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

  const [rows, activeUsers] = await Promise.all([
    selectedYear !== null
      ? getAllSelfEvaluations(selectedYear, { userId: userId || undefined })
      : [],
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">全ユーザー自己評価一覧</h2>
        <p className="text-sm text-gray-500">年度・ユーザーで絞り込んで確認できます。</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <AdminYearSelector
          basePath="/admin/self-evaluations"
          fiscalYears={fiscalYears.map((fy) => ({ year: fy.year, name: fy.name }))}
          selectedYear={selectedYear}
        />

        <AdminUserFilter
          basePath="/admin/self-evaluations"
          users={activeUsers}
          selectedUserId={userId}
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">社員名</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">UID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">評価項目</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">自己採点</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">自己採点理由</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">最終更新日時</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  {selectedYear !== null
                    ? "評価データがありません。"
                    : "年度を選択してください。"}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.evaluatee.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-500">{r.item.uid}</td>
                  <td className="px-4 py-3 text-gray-700">{r.item.name}</td>
                  <td className="px-4 py-3">
                    {r.selfScore === null ? (
                      <span className="text-gray-400">未入力</span>
                    ) : (
                      <span
                        className={
                          r.selfScore === "none"
                            ? "text-gray-500"
                            : "font-medium text-gray-900"
                        }
                      >
                        {SCORE_LABEL[r.selfScore]}
                      </span>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-700">
                    {r.selfReason ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.updatedAt.toLocaleString("ja-JP")}
                  </td>
                </tr>
              ))
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
