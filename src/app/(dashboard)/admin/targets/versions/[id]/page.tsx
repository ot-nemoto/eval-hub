import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { getEvalItemVersionDetails } from "@/lib/eval-item-versions";

type Detail = {
  no: number;
  name: string;
  description: string | null;
  evalCriteria: string | null;
  index: number;
  targetNo: number;
  targetName: string;
  targetIndex: number;
  categoryNo: number;
  categoryName: string;
  categoryIndex: number;
};

type Category = {
  no: number;
  name: string;
  items: Detail[];
};

type Target = {
  no: number;
  name: string;
  categories: Category[];
};

function buildTree(details: Detail[]): Target[] {
  const targetsMap = new Map<string, Target>();
  const categoriesMap = new Map<string, Category>();

  for (const d of details) {
    const targetKey = `${d.targetIndex}-${d.targetNo}`;
    let target = targetsMap.get(targetKey);
    if (!target) {
      target = { no: d.targetNo, name: d.targetName, categories: [] };
      targetsMap.set(targetKey, target);
    }

    const categoryKey = `${targetKey}-${d.categoryIndex}-${d.categoryNo}`;
    let cat = categoriesMap.get(categoryKey);
    if (!cat) {
      cat = { no: d.categoryNo, name: d.categoryName, items: [] };
      categoriesMap.set(categoryKey, cat);
      target.categories.push(cat);
    }

    cat.items.push(d);
  }

  return Array.from(targetsMap.values());
}

export default async function VersionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  const { id } = await params;
  const versionId = Number(id);
  if (!Number.isInteger(versionId) || versionId < 1) notFound();

  let version: { id: number; name: string; createdAt: Date };
  let details: Detail[];
  try {
    ({ version, details } = await getEvalItemVersionDetails(versionId));
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  const tree = buildTree(details);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">{version.name}</h2>
        <p className="text-sm text-gray-500">
          作成日時：{version.createdAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
          ・評価項目数：{details.length}
        </p>
      </div>

      {tree.length === 0 ? (
        <div className="rounded-lg border bg-white px-4 py-8 text-center text-sm text-gray-500">
          このバージョンには評価項目がありません。
        </div>
      ) : (
        <div className="space-y-6">
          {tree.map((target) => (
            <div key={target.no} className="overflow-hidden rounded-lg border bg-white">
              <div className="border-b bg-gray-50 px-4 py-3">
                <span className="text-xs font-medium text-gray-400 mr-2">No.{target.no}</span>
                <span className="font-medium text-gray-900">{target.name}</span>
              </div>

              <div className="px-4 py-2">
                {target.categories.map((cat) => (
                  <div key={cat.no} className="border-b last:border-b-0 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">{cat.no}</span>
                      <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                    </div>

                    {cat.items.length > 0 ? (
                      <table className="w-full text-sm ml-4">
                        <thead>
                          <tr className="text-xs text-gray-500">
                            <th className="py-1 pr-2 text-left w-10">No</th>
                            <th className="py-1 pr-2 text-left">名称</th>
                            <th className="py-1 pr-2 text-left">説明</th>
                            <th className="py-1 text-left">評価基準</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {cat.items.map((item) => (
                            <tr key={item.no} className="text-gray-700">
                              <td className="py-1.5 pr-2 text-xs text-gray-400">{item.no}</td>
                              <td className="py-1.5 pr-2">{item.name}</td>
                              <td className="py-1.5 pr-2 text-xs text-gray-500 whitespace-pre-wrap">
                                {item.description || "—"}
                              </td>
                              <td className="py-1.5 text-xs text-gray-500 whitespace-pre-wrap">
                                {item.evalCriteria || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="ml-4 text-xs text-gray-400">評価項目がありません。</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
