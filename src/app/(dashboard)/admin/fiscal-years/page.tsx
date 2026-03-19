import { redirect } from "next/navigation";
import { FiscalYearActions } from "@/components/admin/FiscalYearActions";
import { FiscalYearForm } from "@/components/admin/FiscalYearForm";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function FiscalYearsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/evaluations");

  const fiscalYears = await prisma.fiscalYear.findMany({
    orderBy: { year: "desc" },
    select: { year: true, name: true, start_date: true, end_date: true, is_current: true },
  });

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
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {fiscalYears.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  年度が登録されていません。
                </td>
              </tr>
            ) : (
              fiscalYears.map((fy) => (
                <tr key={fy.year} className={fy.is_current ? "bg-blue-50" : "hover:bg-gray-50"}>
                  <td className="px-4 py-3 font-medium text-gray-900">{fy.year}</td>
                  <td className="px-4 py-3 text-gray-700">{fy.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {fy.start_date.toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {fy.end_date.toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3">
                    {fy.is_current ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        現在
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <FiscalYearActions fiscalYear={fy} />
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
