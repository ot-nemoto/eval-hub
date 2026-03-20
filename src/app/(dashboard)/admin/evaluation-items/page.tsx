import { redirect } from "next/navigation";
import { EvaluationItemActions } from "@/components/admin/EvaluationItemActions";
import { EvaluationItemForm } from "@/components/admin/EvaluationItemForm";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EvaluationItemsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/evaluations");

  const items = await prisma.evaluationItem.findMany({
    orderBy: [{ target_no: "asc" }, { category_no: "asc" }, { item_no: "asc" }],
    select: {
      uid: true,
      target: true,
      category: true,
      name: true,
      description: true,
      eval_criteria: true,
      two_year_rule: true,
      _count: { select: { fiscal_year_items: true } },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">評価項目管理</h2>
        <p className="text-sm text-gray-500">評価項目の追加・編集・削除を行います。</p>
      </div>

      <div className="mb-6">
        <EvaluationItemForm />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">UID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">大分類</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">中分類</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">名称</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">２年ルール</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  評価項目が登録されていません。
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.uid} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.uid}</td>
                  <td className="px-4 py-3 text-gray-700">{item.target}</td>
                  <td className="px-4 py-3 text-gray-700">{item.category}</td>
                  <td className="px-4 py-3 text-gray-900">{item.name}</td>
                  <td className="px-4 py-3">
                    {item.two_year_rule ? (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                        対象
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <EvaluationItemActions item={item} hasEvaluations={item._count.fiscal_year_items > 0} />
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
