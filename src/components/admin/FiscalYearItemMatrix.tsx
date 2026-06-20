"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  copyFiscalYearItemsAction,
  toggleFiscalYearItemAction,
} from "@/app/(dashboard)/admin/fiscal-year-items/actions";

type EvalItem = {
  id: number;
  no: number;
  name: string;
  target: { id: number; no: number; name: string };
  category: { id: number; no: number; name: string };
};

type Props = {
  year: number;
  isLocked: boolean;
  allItems: EvalItem[];
  enabledItemIds: number[];
  previousYear: number | null;
};

type GroupedItems = {
  target: { id: number; no: number; name: string };
  categories: {
    category: { id: number; no: number; name: string };
    items: EvalItem[];
  }[];
};

function groupItems(items: EvalItem[]): GroupedItems[] {
  const targetMap = new Map<number, GroupedItems>();

  for (const item of items) {
    let group = targetMap.get(item.target.id);
    if (!group) {
      group = { target: item.target, categories: [] };
      targetMap.set(item.target.id, group);
    }

    let catGroup = group.categories.find((c) => c.category.id === item.category.id);
    if (!catGroup) {
      catGroup = { category: item.category, items: [] };
      group.categories.push(catGroup);
    }

    catGroup.items.push(item);
  }

  return Array.from(targetMap.values());
}

export function FiscalYearItemMatrix({
  year,
  isLocked,
  allItems,
  enabledItemIds,
  previousYear,
}: Props) {
  const router = useRouter();
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set(enabledItemIds));
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [copying, startCopyTransition] = useTransition();

  const enabledKey = enabledItemIds.join(",");
  const [prevEnabledKey, setPrevEnabledKey] = useState(enabledKey);
  if (enabledKey !== prevEnabledKey) {
    setPrevEnabledKey(enabledKey);
    setCheckedIds(new Set(enabledItemIds));
  }

  const grouped = groupItems(allItems);

  async function handleToggle(itemId: number, checked: boolean) {
    setError(null);
    setSavingIds((prev) => new Set(prev).add(itemId));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });

    try {
      const result = await toggleFiscalYearItemAction(year, itemId, checked);
      if (result.error) {
        setError(result.error);
        setCheckedIds((prev) => {
          const next = new Set(prev);
          if (checked) next.delete(itemId);
          else next.add(itemId);
          return next;
        });
      }
    } catch {
      alert("通信エラーが発生しました");
      setCheckedIds((prev) => {
        const next = new Set(prev);
        if (checked) next.delete(itemId);
        else next.add(itemId);
        return next;
      });
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }

  function handleCopy() {
    if (previousYear === null) return;
    if (
      !confirm(
        `${previousYear} 年度の設定を ${year} 年度にコピーします。\n現在の設定は上書きされます。よろしいですか？`,
      )
    )
      return;

    setError(null);
    startCopyTransition(async () => {
      const result = await copyFiscalYearItemsAction(year, previousYear);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const enabledCount = checkedIds.size;
  const totalCount = allItems.length;

  if (allItems.length === 0) {
    return (
      <div className="rounded-lg border bg-white px-4 py-8 text-center text-gray-500">
        評価項目が登録されていません。先にマスタ管理で評価項目を追加してください。
      </div>
    );
  }

  return (
    <div>
      {isLocked && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          この年度はロックされているため編集できません。
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {enabledCount} / {totalCount} 項目が有効
        </p>
        {previousYear !== null && !isLocked && (
          <button
            type="button"
            onClick={handleCopy}
            disabled={copying}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {copying ? "コピー中..." : `${previousYear} 年度からコピー`}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="w-12 px-4 py-3 text-center font-medium text-gray-700">有効</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">UID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">評価項目</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {grouped.map((group) => (
              <GroupSection
                key={group.target.id}
                group={group}
                checkedIds={checkedIds}
                savingIds={savingIds}
                isLocked={isLocked}
                onToggle={handleToggle}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        {enabledCount} / {totalCount} 項目が有効
      </p>
    </div>
  );
}

function GroupSection({
  group,
  checkedIds,
  savingIds,
  isLocked,
  onToggle,
}: {
  group: GroupedItems;
  checkedIds: Set<number>;
  savingIds: Set<number>;
  isLocked: boolean;
  onToggle: (itemId: number, checked: boolean) => void;
}) {
  return (
    <>
      <tr className="bg-gray-50">
        <td colSpan={3} className="px-4 py-2 font-medium text-gray-700">
          {group.target.no}. {group.target.name}
        </td>
      </tr>
      {group.categories.map((cat) => (
        <CategorySection
          key={cat.category.id}
          targetNo={group.target.no}
          category={cat}
          checkedIds={checkedIds}
          savingIds={savingIds}
          isLocked={isLocked}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

function CategorySection({
  targetNo,
  category,
  checkedIds,
  savingIds,
  isLocked,
  onToggle,
}: {
  targetNo: number;
  category: { category: { id: number; no: number; name: string }; items: EvalItem[] };
  checkedIds: Set<number>;
  savingIds: Set<number>;
  isLocked: boolean;
  onToggle: (itemId: number, checked: boolean) => void;
}) {
  return (
    <>
      <tr className="bg-gray-50/50">
        <td />
        <td colSpan={2} className="px-4 py-1.5 text-xs font-medium text-gray-500">
          {targetNo}-{category.category.no}. {category.category.name}
        </td>
      </tr>
      {category.items.map((item) => {
        const uid = `${targetNo}-${category.category.no}-${item.no}`;
        const checked = checkedIds.has(item.id);
        const saving = savingIds.has(item.id);

        return (
          <tr key={item.id} className="hover:bg-gray-50">
            <td className="px-4 py-2 text-center">
              <input
                type="checkbox"
                checked={checked}
                disabled={isLocked || saving}
                onChange={(e) => onToggle(item.id, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                aria-label={`${uid} ${item.name}`}
              />
            </td>
            <td className="px-4 py-2 font-mono text-xs text-gray-400">{uid}</td>
            <td className="px-4 py-2 text-gray-700">
              {item.name}
              {saving && <span className="ml-2 text-xs text-gray-400">保存中...</span>}
            </td>
          </tr>
        );
      })}
    </>
  );
}
