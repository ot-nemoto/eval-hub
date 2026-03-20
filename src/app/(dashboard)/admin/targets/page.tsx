import { redirect } from "next/navigation";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { CategoryActions } from "@/components/admin/CategoryActions";
import { TargetActions } from "@/components/admin/TargetActions";
import { TargetForm } from "@/components/admin/TargetForm";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TargetsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/evaluations");

  const targets = await prisma.target.findMany({
    orderBy: { no: "asc" },
    include: {
      _count: { select: { categories: true } },
      categories: {
        orderBy: { no: "asc" },
        include: { _count: { select: { evaluation_items: true } } },
      },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">マスタ管理</h2>
        <p className="text-sm text-gray-500">大分類・中分類の追加・編集・削除を行います。</p>
      </div>

      <div className="mb-6">
        <TargetForm />
      </div>

      {targets.length === 0 ? (
        <div className="rounded-lg border bg-white px-4 py-8 text-center text-sm text-gray-500">
          大分類が登録されていません。
        </div>
      ) : (
        <div className="space-y-6">
          {targets.map((target) => (
            <div key={target.id} className="overflow-hidden rounded-lg border bg-white">
              {/* 大分類ヘッダー */}
              <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-400">No.{target.no}</span>
                  <span className="font-medium text-gray-900">{target.name}</span>
                </div>
                <TargetActions
                  target={{ id: target.id, name: target.name, no: target.no }}
                  canDelete={target._count.categories === 0}
                />
              </div>

              {/* 中分類テーブル */}
              <div className="px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">中分類</span>
                  <CategoryForm targetId={target.id} />
                </div>

                {target.categories.length === 0 ? (
                  <p className="py-2 text-xs text-gray-400">中分類が登録されていません。</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="py-2 text-left text-xs font-medium text-gray-500">No</th>
                        <th className="py-2 text-left text-xs font-medium text-gray-500">名称</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {target.categories.map((cat) => (
                        <tr key={cat.id} className="hover:bg-gray-50">
                          <td className="py-2 pr-4 text-xs text-gray-400">{cat.no}</td>
                          <td className="py-2 text-gray-700">{cat.name}</td>
                          <td className="py-2 text-right">
                            <CategoryActions
                              category={{ id: cat.id, target_id: cat.target_id, name: cat.name, no: cat.no }}
                              canDelete={cat._count.evaluation_items === 0}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
