import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CompareSelector } from "@/components/admin/CompareSelector";
import { getSession } from "@/lib/auth";
import {
  getCurrentEvalItems,
  getEvalItemVersionDetails,
  getEvalItemVersions,
} from "@/lib/eval-item-versions";

type Item = {
  evaluationItemId: number;
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

type DiffStatus = "added" | "removed" | "changed" | "unchanged";

type DiffItem = {
  evaluationItemId: number;
  status: DiffStatus;
  left: Item | null;
  right: Item | null;
};

type DiffCategory = {
  no: number;
  name: string;
  items: DiffItem[];
};

type DiffTarget = {
  no: number;
  name: string;
  categories: DiffCategory[];
};

function computeDiff(leftItems: Item[], rightItems: Item[]): DiffItem[] {
  const leftMap = new Map(leftItems.map((i) => [i.evaluationItemId, i]));
  const rightMap = new Map(rightItems.map((i) => [i.evaluationItemId, i]));
  const allIds = new Set([...leftMap.keys(), ...rightMap.keys()]);

  const result: DiffItem[] = [];
  for (const id of allIds) {
    const left = leftMap.get(id) ?? null;
    const right = rightMap.get(id) ?? null;

    if (!left) {
      result.push({ evaluationItemId: id, status: "added", left: null, right });
    } else if (!right) {
      result.push({ evaluationItemId: id, status: "removed", left, right: null });
    } else {
      const changed =
        left.no !== right.no ||
        left.name !== right.name ||
        left.description !== right.description ||
        left.evalCriteria !== right.evalCriteria;
      result.push({ evaluationItemId: id, status: changed ? "changed" : "unchanged", left, right });
    }
  }

  return result;
}

function buildDiffTree(diffItems: DiffItem[]): DiffTarget[] {
  const targetsMap = new Map<string, DiffTarget>();
  const categoriesMap = new Map<string, DiffCategory>();

  for (const d of diffItems) {
    const item = d.right ?? d.left;
    if (!item) continue;

    const targetKey = `${item.targetIndex}-${item.targetNo}`;
    let target = targetsMap.get(targetKey);
    if (!target) {
      target = { no: item.targetNo, name: item.targetName, categories: [] };
      targetsMap.set(targetKey, target);
    }

    const categoryKey = `${targetKey}-${item.categoryIndex}-${item.categoryNo}`;
    let cat = categoriesMap.get(categoryKey);
    if (!cat) {
      cat = { no: item.categoryNo, name: item.categoryName, items: [] };
      categoriesMap.set(categoryKey, cat);
      target.categories.push(cat);
    }

    cat.items.push(d);
  }

  return Array.from(targetsMap.values());
}

const statusStyles: Record<DiffStatus, string> = {
  added: "bg-green-50",
  removed: "bg-red-50",
  changed: "bg-yellow-50",
  unchanged: "",
};

const statusLabels: Record<DiffStatus, string | null> = {
  added: "追加",
  removed: "削除",
  changed: "変更",
  unchanged: null,
};

async function loadItems(source: string): Promise<{ label: string; items: Item[] }> {
  if (source === "current") {
    return { label: "現在のマスタ", items: await getCurrentEvalItems() };
  }
  const id = Number(source);
  if (!Number.isInteger(id) || id < 1) {
    return { label: "不明", items: [] };
  }
  try {
    const { version, details } = await getEvalItemVersionDetails(id);
    return { label: version.name, items: details };
  } catch {
    return { label: "不明", items: [] };
  }
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ left?: string; right?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  const params = await searchParams;
  const leftSource = params.left || "current";
  const rightSource = params.right || "current";

  const versions = await getEvalItemVersions();
  const versionOptions = versions.map((v) => ({ id: v.id, name: v.name }));

  const [leftData, rightData] = await Promise.all([loadItems(leftSource), loadItems(rightSource)]);

  const diffItems = computeDiff(leftData.items, rightData.items);
  const tree = buildDiffTree(diffItems);

  const addedCount = diffItems.filter((d) => d.status === "added").length;
  const removedCount = diffItems.filter((d) => d.status === "removed").length;
  const changedCount = diffItems.filter((d) => d.status === "changed").length;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">評価項目の比較</h2>
        <div className="mt-2">
          <Suspense>
            <CompareSelector
              versions={versionOptions}
              leftValue={leftSource}
              rightValue={rightSource}
            />
          </Suspense>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {leftData.label} と {rightData.label} を比較しています。
          {addedCount > 0 && <span className="ml-2 text-green-700">追加: {addedCount}</span>}
          {removedCount > 0 && <span className="ml-2 text-red-700">削除: {removedCount}</span>}
          {changedCount > 0 && <span className="ml-2 text-yellow-700">変更: {changedCount}</span>}
          {addedCount === 0 && removedCount === 0 && changedCount === 0 && (
            <span className="ml-2 text-gray-500">差分なし</span>
          )}
        </p>
      </div>

      {tree.length === 0 ? (
        <div className="rounded-lg border bg-white px-4 py-8 text-center text-sm text-gray-500">
          比較対象に評価項目がありません。
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

                    <table className="w-full text-sm ml-4 table-fixed">
                      <colgroup>
                        <col className="w-[5%]" />
                        <col className="w-[13%]" />
                        <col className="w-[30%]" />
                        <col className="w-[42%]" />
                        <col className="w-[10%]" />
                      </colgroup>
                      <thead>
                        <tr className="text-xs text-gray-500">
                          <th className="py-1 pr-2 text-left">No</th>
                          <th className="py-1 pr-2 text-left">名称</th>
                          <th className="py-1 pr-2 text-left">説明</th>
                          <th className="py-1 pr-2 text-left">評価基準</th>
                          <th className="py-1 text-left">状態</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {cat.items.map((d) => {
                          const item = d.right ?? d.left;
                          if (!item) return null;
                          return (
                            <tr key={d.evaluationItemId} className={statusStyles[d.status]}>
                              <td className="py-1.5 pr-2 text-xs text-gray-400">
                                {d.status === "changed" &&
                                d.left &&
                                d.right &&
                                d.left.no !== d.right.no ? (
                                  <span>
                                    {d.left.no} → {d.right.no}
                                  </span>
                                ) : (
                                  item.no
                                )}
                              </td>
                              <td className="py-1.5 pr-2">
                                {d.status === "changed" &&
                                d.left &&
                                d.right &&
                                d.left.name !== d.right.name ? (
                                  <span>
                                    <span className="line-through text-gray-400">
                                      {d.left.name}
                                    </span>
                                    <br />
                                    {d.right.name}
                                  </span>
                                ) : (
                                  item.name
                                )}
                              </td>
                              <td className="py-1.5 pr-2 text-xs text-gray-500 whitespace-pre-wrap">
                                {d.status === "changed" &&
                                d.left &&
                                d.right &&
                                d.left.description !== d.right.description ? (
                                  <span>
                                    <span className="line-through text-gray-400">
                                      {d.left.description || "—"}
                                    </span>
                                    <br />
                                    {d.right.description || "—"}
                                  </span>
                                ) : (
                                  item.description || "—"
                                )}
                              </td>
                              <td className="py-1.5 pr-2 text-xs text-gray-500 whitespace-pre-wrap">
                                {d.status === "changed" &&
                                d.left &&
                                d.right &&
                                d.left.evalCriteria !== d.right.evalCriteria ? (
                                  <span>
                                    <span className="line-through text-gray-400">
                                      {d.left.evalCriteria || "—"}
                                    </span>
                                    <br />
                                    {d.right.evalCriteria || "—"}
                                  </span>
                                ) : (
                                  item.evalCriteria || "—"
                                )}
                              </td>
                              <td className="py-1.5 text-xs font-medium">
                                {statusLabels[d.status] && (
                                  <span
                                    className={
                                      d.status === "added"
                                        ? "text-green-700"
                                        : d.status === "removed"
                                          ? "text-red-700"
                                          : "text-yellow-700"
                                    }
                                  >
                                    {statusLabels[d.status]}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
