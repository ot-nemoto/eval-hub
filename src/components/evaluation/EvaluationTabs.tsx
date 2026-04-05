"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Score = "none" | "ka" | "ryo" | "yu";

const SCORE_LABELS: Record<Score, string> = {
  none: "なし",
  ka: "可",
  ryo: "良",
  yu: "優",
};

type Item = {
  id: number;
  uid: string;
  name: string;
  description: string | null;
  evalCriteria: string | null;
  category: string;
  target: string;
  selfScore: Score | null;
  selfReason: string | null;
  managerScore: Score | null;
  managerReason: string | null;
};

type Props = {
  items: Item[];
  userId: string;
  fiscalYear: number;
};

export default function EvaluationTabs({ items, userId, fiscalYear }: Props) {
  const categories = [...new Set(items.map((i) => i.category))];
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? "");

  const [scores, setScores] = useState<Record<number, Score>>(
    Object.fromEntries(items.map((i) => [i.id, i.selfScore ?? "none"])),
  );
  const [reasons, setReasons] = useState<Record<number, string>>(
    Object.fromEntries(items.map((i) => [i.id, i.selfReason ?? ""])),
  );
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const savedTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const activeItems = items.filter((i) => i.category === activeCategory);

  async function handleSave(id: number) {
    setSaving((s) => ({ ...s, [id]: true }));
    setErrors((e) => ({ ...e, [id]: "" }));
    try {
      const res = await fetch(
        `/api/members/${userId}/evaluations/${fiscalYear}/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            self_score: scores[id] ?? "none",
            self_reason: reasons[id] ?? "",
          }),
        },
      );
      if (!res.ok) throw new Error();
      setSaved((s) => ({ ...s, [id]: true }));
      clearTimeout(savedTimers.current[id]);
      savedTimers.current[id] = setTimeout(() => setSaved((s) => ({ ...s, [id]: false })), 2000);
    } catch {
      setErrors((e) => ({ ...e, [id]: "保存に失敗しました" }));
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  }

  if (categories.length === 0) {
    return <p className="text-gray-500">評価項目がありません。</p>;
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-6">
        {activeItems.map((item) => (
          <div key={item.id} className="rounded-lg border bg-white p-5">
            <div className="mb-4">
              <span className="text-xs font-medium text-gray-400">{item.uid}</span>
              <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
              {item.description && (
                <p className="mt-1 text-sm text-gray-600">{item.description}</p>
              )}
              {item.evalCriteria && (
                <p className="mt-1 text-xs text-gray-400">
                  評価基準: {item.evalCriteria}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {/* Score */}
              <div>
                <p className="block text-sm font-medium text-gray-700">
                  自己採点
                </p>
                <div className="mt-1 flex gap-2">
                  {(["none", "ka", "ryo", "yu"] as Score[]).map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() =>
                        setScores((s) => ({ ...s, [item.id]: score }))
                      }
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        scores[item.id] === score
                          ? "bg-blue-600 text-white"
                          : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {SCORE_LABELS[score]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label htmlFor={`reason-${item.id}`} className="block text-sm font-medium text-gray-700">
                  自己採点理由
                </label>
                <textarea
                  id={`reason-${item.id}`}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                  value={reasons[item.id] ?? ""}
                  onChange={(e) =>
                    setReasons((r) => ({ ...r, [item.id]: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => handleSave(item.id)}
                  disabled={saving[item.id]}
                >
                  {saving[item.id] ? "保存中..." : "保存"}
                </Button>
                {saved[item.id] && (
                  <span className="text-sm text-green-600">保存しました</span>
                )}
                {errors[item.id] && (
                  <span className="text-sm text-red-600">{errors[item.id]}</span>
                )}
              </div>
            </div>

            {/* 評価者採点（読み取り専用） */}
            {item.managerScore !== null && (
              <div className="mt-4 rounded-md bg-gray-50 p-3">
                <p className="mb-1 text-xs font-medium text-gray-500">評価者採点（参考）</p>
                <div className="flex items-center gap-3">
                  <span className="rounded-md border bg-white px-2 py-1 text-sm font-medium text-gray-700">
                    {SCORE_LABELS[item.managerScore]}
                  </span>
                  {item.managerReason && (
                    <span className="min-w-0 break-words text-sm text-gray-600">{item.managerReason}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
