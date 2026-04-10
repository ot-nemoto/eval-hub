"use client";

import type { Score } from "@prisma/client";
import { useRef, useState } from "react";
import { upsertSelfEvaluationAction } from "@/app/(dashboard)/evaluations/actions";
import { Button } from "@/components/ui/button";

const SCORE_LABELS: Record<Score, string> = {
  none: "なし",
  ka: "可",
  ryo: "良",
  yu: "優",
};

type ManagerComment = {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  reason: string | null;
  createdAt: Date;
};

type Item = {
  uid: string;
  name: string;
  description: string | null;
  evalCriteria: string | null;
  category: string;
  target: string;
  selfScore: Score | null;
  selfReason: string | null;
  managerComments: ManagerComment[];
};

type Props = {
  items: Item[];
  fiscalYear: number;
  isLocked?: boolean;
};

export default function EvaluationTabs({ items, fiscalYear, isLocked = false }: Props) {
  const categories = [...new Set(items.map((i) => i.category))];
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? "");

  const [scores, setScores] = useState<Record<string, Score>>(
    Object.fromEntries(items.map((i) => [i.uid, i.selfScore ?? "none"])),
  );
  const [reasons, setReasons] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [i.uid, i.selfReason ?? ""])),
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
      const result = await upsertSelfEvaluationAction(fiscalYear, Number(uid), {
        selfScore: scores[uid] ?? "none",
        selfReason: reasons[uid] ?? "",
      });
      if (result.error) {
        setErrors((e) => ({ ...e, [uid]: result.error ?? "保存に失敗しました" }));
      } else {
        setSaved((s) => ({ ...s, [uid]: true }));
        clearTimeout(savedTimers.current[uid]);
        savedTimers.current[uid] = setTimeout(() => setSaved((s) => ({ ...s, [uid]: false })), 2000);
      }
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
      {/* ロック済みバナー */}
      {isLocked && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <span>🔒</span>
          <span>この年度はロック済みです。閲覧のみ可能です。</span>
        </div>
      )}

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
              {item.description && <p className="mt-1 text-sm text-gray-600">{item.description}</p>}
              {item.evalCriteria && (
                <p className="mt-1 text-xs text-gray-400">評価基準: {item.evalCriteria}</p>
              )}
            </div>

            <div className="space-y-3">
              {/* Score */}
              <div>
                <p className="block text-sm font-medium text-gray-700">自己採点</p>
                {isLocked ? (
                  <p className="mt-1 text-sm text-gray-500">
                    {scores[item.uid] ? SCORE_LABELS[scores[item.uid]] : "未入力"}
                  </p>
                ) : (
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
                )}
              </div>

              {/* Reason */}
              <div>
                <p className="block text-sm font-medium text-gray-700">自己採点理由</p>
                {isLocked ? (
                  <p className="mt-1 text-sm text-gray-500">{reasons[item.uid] || "未入力"}</p>
                ) : (
                  <textarea
                    id={`reason-${item.uid}`}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={3}
                    value={reasons[item.uid] ?? ""}
                    onChange={(e) => setReasons((r) => ({ ...r, [item.uid]: e.target.value }))}
                  />
                )}
              </div>

              {!isLocked && (
                <div className="flex items-center gap-3">
                  <Button size="sm" onClick={() => handleSave(item.uid)} disabled={saving[item.uid]}>
                    {saving[item.uid] ? "保存中..." : "保存"}
                  </Button>
                  {saved[item.uid] && <span className="text-sm text-green-600">保存しました</span>}
                  {errors[item.uid] && (
                    <span className="text-sm text-red-600">{errors[item.uid]}</span>
                  )}
                </div>
              )}
            </div>

            {/* 評価者コメント（読み取り専用） */}
            {item.managerComments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-gray-500">評価者コメント（参考）</p>
                {item.managerComments.map((cm) => (
                  <div key={cm.id} className="rounded-md bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-700">{cm.evaluatorName}</span>
                      <span className="text-xs text-gray-400" suppressHydrationWarning>
                        {new Date(cm.createdAt).toLocaleString("ja-JP")}
                      </span>
                    </div>
                    {cm.reason && (
                      <p className="mt-1 break-words text-sm text-gray-600">{cm.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
