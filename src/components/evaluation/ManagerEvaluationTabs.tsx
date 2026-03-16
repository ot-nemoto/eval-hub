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
  uid: string;
  name: string;
  description: string | null;
  eval_criteria: string | null;
  category: string;
  target: string;
  self_score: Score | null;
  self_reason: string | null;
  manager_score: Score | null;
  manager_reason: string | null;
};

type Props = {
  items: Item[];
  evaluateeId: string;
  fiscalYear: number;
};

export default function ManagerEvaluationTabs({ items, evaluateeId, fiscalYear }: Props) {
  const categories = [...new Set(items.map((i) => i.category))];
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? "");

  const [scores, setScores] = useState<Record<string, Score>>(
    Object.fromEntries(items.map((i) => [i.uid, i.manager_score ?? "none"])),
  );
  const [reasons, setReasons] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [i.uid, i.manager_reason ?? ""])),
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const savedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const activeItems = items.filter((i) => i.category === activeCategory);

  async function handleSave(uid: string) {
    setSaving((s) => ({ ...s, [uid]: true }));
    setErrors((e) => ({ ...e, [uid]: "" }));
    try {
      const res = await fetch(
        `/api/members/${evaluateeId}/evaluations/${fiscalYear}/${uid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manager_score: scores[uid] ?? "none",
            manager_reason: reasons[uid] ?? "",
          }),
        },
      );
      if (!res.ok) throw new Error();
      setSaved((s) => ({ ...s, [uid]: true }));
      clearTimeout(savedTimers.current[uid]);
      savedTimers.current[uid] = setTimeout(
        () => setSaved((s) => ({ ...s, [uid]: false })),
        2000,
      );
    } catch {
      setErrors((e) => ({ ...e, [uid]: "保存に失敗しました" }));
    } finally {
      setSaving((s) => ({ ...s, [uid]: false }));
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
          <div key={item.uid} className="rounded-lg border bg-white p-5">
            <div className="mb-4">
              <span className="text-xs font-medium text-gray-400">{item.uid}</span>
              <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
              {item.description && (
                <p className="mt-1 text-sm text-gray-600">{item.description}</p>
              )}
              {item.eval_criteria && (
                <p className="mt-1 text-xs text-gray-400">
                  評価基準: {item.eval_criteria}
                </p>
              )}
            </div>

            {/* 自己評価（読み取り専用） */}
            <div className="mb-4 rounded-md bg-gray-50 p-3">
              <p className="mb-1 text-xs font-medium text-gray-500">自己評価（参考）</p>
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-white px-2 py-1 text-sm font-medium text-gray-700 border">
                  {item.self_score ? SCORE_LABELS[item.self_score] : "未入力"}
                </span>
                {item.self_reason && (
                  <span className="text-sm text-gray-600">{item.self_reason}</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {/* 評価者採点 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  評価者採点
                </label>
                <div className="mt-1 flex gap-2">
                  {(["none", "ka", "ryo", "yu"] as Score[]).map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setScores((s) => ({ ...s, [item.uid]: score }))}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        scores[item.uid] === score
                          ? "bg-blue-600 text-white"
                          : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {SCORE_LABELS[score]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 評価者採点理由 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  評価者採点理由
                </label>
                <textarea
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                  value={reasons[item.uid] ?? ""}
                  onChange={(e) =>
                    setReasons((r) => ({ ...r, [item.uid]: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => handleSave(item.uid)}
                  disabled={saving[item.uid]}
                >
                  {saving[item.uid] ? "保存中..." : "保存"}
                </Button>
                {saved[item.uid] && (
                  <span className="text-sm text-green-600">保存しました</span>
                )}
                {errors[item.uid] && (
                  <span className="text-sm text-red-600">{errors[item.uid]}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
