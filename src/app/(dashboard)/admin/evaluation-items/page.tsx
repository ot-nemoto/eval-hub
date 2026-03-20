import { redirect } from "next/navigation";
import { EvaluationItemActions } from "@/components/admin/EvaluationItemActions";
import { EvaluationItemForm } from "@/components/admin/EvaluationItemForm";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EvaluationItemsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/evaluations");

  const [targets, categories] = await Promise.all([
    prisma.target.findMany({ orderBy: { no: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({ orderBy: { no: "asc" }, select: { id: true, targetId: true, name: true } }),
  ]);

  const items = await prisma.evaluationItem.findMany({
    orderBy: [{ target: { no: "asc" } }, { category: { no: "asc" } }, { no: "asc" }],
    select: {
      id: true,
      no: true,
      name: true,
      description: true,
      evalCriteria: true,
      target: { select: { name: true, no: true } },
      category: { select: { name: true, no: true } },
      _count: { select: { fiscalYearItems: true } },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">評価項目管理</h2>
        <p className="text-sm text-gray-500">評価項目の追加・編集・削除を行います。</p>
      </div>

      <div className="mb-6">
        <EvaluationItemForm targets={targets} categories={categories} />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">UID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">大分類</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">中分類</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">名称</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  評価項目が登録されていません。
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{`${item.target.no}-${item.category.no}-${item.no}`}</td>
                  <td className="px-4 py-3 text-gray-700">{item.target.name}</td>
                  <td className="px-4 py-3 text-gray-700">{item.category.name}</td>
                  <td className="px-4 py-3 text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-right">
                    <EvaluationItemActions item={item} hasEvaluations={item._count.fiscalYearItems > 0} />
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
