"use client";

import type { Score } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import {
  addManagerCommentAction,
  deleteManagerCommentAction,
  updateManagerCommentAction,
  upsertManagerScoreAction,
} from "@/app/(dashboard)/members/actions";
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
  managerScore: Score | null;
  evaluationId: string | null;
  managerComments: ManagerComment[];
};

type Props = {
  items: Item[];
  evaluateeId: string;
  fiscalYear: number;
  currentUserId: string;
  isAdmin: boolean;
};

export default function ManagerEvaluationTabs({
  items,
  evaluateeId,
  fiscalYear,
  currentUserId,
  isAdmin,
}: Props) {
  const categories = [...new Set(items.map((i) => i.category))];
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? "");

  // 最終スコア state（uid → Score | null）
  const [finalScores, setFinalScores] = useState<Record<string, Score | null>>(
    Object.fromEntries(items.map((i) => [i.uid, i.managerScore])),
  );
  const [savingScore, setSavingScore] = useState<Record<string, boolean>>({});
  const [savedScore, setSavedScore] = useState<Record<string, boolean>>({});
  const [scoreErrors, setScoreErrors] = useState<Record<string, string>>({});
  const savedScoreTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // コメント state
  const [comments, setComments] = useState<Record<string, ManagerComment[]>>(
    Object.fromEntries(items.map((i) => [i.uid, i.managerComments])),
  );
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [newReason, setNewReason] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [editReason, setEditReason] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const savedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const scoreTimers = savedScoreTimers.current;
    const commentTimers = savedTimers.current;
    return () => {
      for (const id of Object.values(scoreTimers)) clearTimeout(id);
      for (const id of Object.values(commentTimers)) clearTimeout(id);
    };
  }, []);

  const activeItems = items.filter((i) => i.category === activeCategory);

  async function handleSaveFinalScore(uid: string) {
    setSavingScore((s) => ({ ...s, [uid]: true }));
    setScoreErrors((e) => ({ ...e, [uid]: "" }));
    try {
      const result = await upsertManagerScoreAction(
        evaluateeId,
        fiscalYear,
        Number(uid),
        finalScores[uid] ?? null,
      );
      if (result.error) {
        setScoreErrors((e) => ({ ...e, [uid]: result.error ?? "保存に失敗しました" }));
      } else {
        setSavedScore((s) => ({ ...s, [uid]: true }));
        clearTimeout(savedScoreTimers.current[uid]);
        savedScoreTimers.current[uid] = setTimeout(
          () => setSavedScore((s) => ({ ...s, [uid]: false })),
          2000,
        );
      }
    } catch {
      setScoreErrors((e) => ({ ...e, [uid]: "保存に失敗しました" }));
    } finally {
      setSavingScore((s) => ({ ...s, [uid]: false }));
    }
  }

  async function handleAddComment(uid: string) {
    const reason = newReason[uid] ?? "";
    setSaving((s) => ({ ...s, [`add-${uid}`]: true }));
    setErrors((e) => ({ ...e, [`add-${uid}`]: "" }));
    try {
      const result = await addManagerCommentAction(evaluateeId, fiscalYear, Number(uid), {
        reason: reason || null,
      });
      if (result.error) {
        setErrors((e) => ({ ...e, [`add-${uid}`]: result.error ?? "保存に失敗しました" }));
      } else if (result.comment) {
        setComments((c) => ({ ...c, [uid]: [...(c[uid] ?? []), result.comment!] }));
        setAdding((a) => ({ ...a, [uid]: false }));
        setNewReason((r) => ({ ...r, [uid]: "" }));
      }
    } catch {
      setErrors((e) => ({ ...e, [`add-${uid}`]: "保存に失敗しました" }));
    } finally {
      setSaving((s) => ({ ...s, [`add-${uid}`]: false }));
    }
  }

  async function handleUpdateComment(uid: string, commentId: string) {
    setSaving((s) => ({ ...s, [commentId]: true }));
    setErrors((e) => ({ ...e, [commentId]: "" }));
    try {
      const result = await updateManagerCommentAction(commentId, evaluateeId, {
        reason: editReason[commentId] ?? null,
      });
      if (result.error) {
        setErrors((e) => ({ ...e, [commentId]: result.error ?? "保存に失敗しました" }));
      } else if (result.comment) {
        setComments((c) => ({
          ...c,
          [uid]: c[uid].map((cm) => (cm.id === commentId ? result.comment! : cm)),
        }));
        setEditing((ed) => ({ ...ed, [commentId]: false }));
      }
    } catch {
      setErrors((e) => ({ ...e, [commentId]: "保存に失敗しました" }));
    } finally {
      setSaving((s) => ({ ...s, [commentId]: false }));
    }
  }

  async function handleDeleteComment(uid: string, commentId: string) {
    setSaving((s) => ({ ...s, [`del-${commentId}`]: true }));
    setErrors((e) => ({ ...e, [`del-${commentId}`]: "" }));
    try {
      const result = await deleteManagerCommentAction(commentId, evaluateeId);
      if (result.error) {
        setErrors((e) => ({ ...e, [`del-${commentId}`]: result.error ?? "削除に失敗しました" }));
      } else {
        setComments((c) => ({ ...c, [uid]: c[uid].filter((cm) => cm.id !== commentId) }));
      }
    } catch {
      setErrors((e) => ({ ...e, [`del-${commentId}`]: "削除に失敗しました" }));
    } finally {
      setSaving((s) => ({ ...s, [`del-${commentId}`]: false }));
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
        {activeItems.map((item) => {
          const itemComments = comments[item.uid] ?? [];
          return (
            <div key={item.uid} className="rounded-lg border bg-white p-5">
              <div className="mb-4">
                <span className="text-xs font-medium text-gray-400">{item.uid}</span>
                <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
                {item.description && <p className="mt-1 text-sm text-gray-600">{item.description}</p>}
                {item.evalCriteria && (
                  <p className="mt-1 text-xs text-gray-400">評価基準: {item.evalCriteria}</p>
                )}
              </div>

              {/* 自己評価（読み取り専用） */}
              <div className="mb-4 rounded-md bg-gray-50 p-3">
                <p className="mb-1 text-xs font-medium text-gray-500">自己評価（参考）</p>
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-white px-2 py-1 text-sm font-medium text-gray-700 border">
                    {item.selfScore ? SCORE_LABELS[item.selfScore] : "未入力"}
                  </span>
                  {item.selfReason && (
                    <span className="min-w-0 break-words text-sm text-gray-600">
                      {item.selfReason}
                    </span>
                  )}
                </div>
              </div>

              {/* 最終評価スコア */}
              <div className="mb-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">最終評価スコア</p>
                <div role="radiogroup" aria-label="最終評価スコア" className="flex flex-wrap gap-2">
                  {(["none", "ka", "ryo", "yu"] as Score[]).map((score) => (
                    // biome-ignore lint/a11y/useSemanticElements: カスタムラジオボタン実装（スタイル制御のため button を使用）
                    <button
                      key={score}
                      type="button"
                      role="radio"
                      aria-checked={finalScores[item.uid] === score}
                      onClick={() => setFinalScores((s) => ({ ...s, [item.uid]: score }))}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        finalScores[item.uid] === score
                          ? "bg-blue-600 text-white"
                          : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {SCORE_LABELS[score]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={() => handleSaveFinalScore(item.uid)}
                    disabled={savingScore[item.uid]}
                  >
                    {savingScore[item.uid] ? "保存中..." : "スコアを保存"}
                  </Button>
                  {savedScore[item.uid] && (
                    <span className="text-sm text-green-600">保存しました</span>
                  )}
                  {scoreErrors[item.uid] && (
                    <span className="text-sm text-red-600">{scoreErrors[item.uid]}</span>
                  )}
                </div>
              </div>

              {/* 評価者コメント一覧 */}
              <div className="mb-3 space-y-3">
                <p className="text-sm font-medium text-gray-700">評価者コメント</p>
                {itemComments.length === 0 && (
                  <p className="text-sm text-gray-400">コメントはまだありません。</p>
                )}
                {itemComments.map((cm) => {
                  const canEdit = isAdmin || cm.evaluatorId === currentUserId;
                  const isEditing = editing[cm.id];
                  return (
                    <div key={cm.id} className="rounded-md border bg-gray-50 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-700">{cm.evaluatorName}</span>
                          <span className="text-xs text-gray-400" suppressHydrationWarning>
                            {new Date(cm.createdAt).toLocaleString("ja-JP")}
                          </span>
                        </div>
                        {canEdit && !isEditing && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditing((ed) => ({ ...ed, [cm.id]: true }));
                                setEditReason((r) => ({ ...r, [cm.id]: cm.reason ?? "" }));
                              }}
                            >
                              編集
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteComment(item.uid, cm.id)}
                              disabled={saving[`del-${cm.id}`]}
                            >
                              {saving[`del-${cm.id}`] ? "削除中..." : "削除"}
                            </Button>
                          </div>
                        )}
                      </div>
                      {errors[`del-${cm.id}`] && (
                        <p className="text-xs text-red-600">{errors[`del-${cm.id}`]}</p>
                      )}
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows={3}
                            value={editReason[cm.id] ?? ""}
                            onChange={(e) =>
                              setEditReason((r) => ({ ...r, [cm.id]: e.target.value }))
                            }
                          />
                          {errors[cm.id] && (
                            <p className="text-xs text-red-600">{errors[cm.id]}</p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateComment(item.uid, cm.id)}
                              disabled={saving[cm.id]}
                            >
                              {saving[cm.id] ? "保存中..." : "保存"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditing((ed) => ({ ...ed, [cm.id]: false }))}
                            >
                              キャンセル
                            </Button>
                          </div>
                        </div>
                      ) : (
                        cm.reason && (
                          <p className="mt-1 break-words text-sm text-gray-600">{cm.reason}</p>
                        )
                      )}
                    </div>
                  );
                })}
              </div>

              {/* コメント追加フォーム */}
              {adding[item.uid] ? (
                <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm font-medium text-gray-700">コメントを追加</p>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={3}
                    placeholder="コメント・採点理由（任意）"
                    value={newReason[item.uid] ?? ""}
                    onChange={(e) =>
                      setNewReason((r) => ({ ...r, [item.uid]: e.target.value }))
                    }
                  />
                  {errors[`add-${item.uid}`] && (
                    <p className="text-xs text-red-600">{errors[`add-${item.uid}`]}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAddComment(item.uid)}
                      disabled={saving[`add-${item.uid}`]}
                    >
                      {saving[`add-${item.uid}`] ? "保存中..." : "保存"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAdding((a) => ({ ...a, [item.uid]: false }))}
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAdding((a) => ({ ...a, [item.uid]: true }))}
                >
                  コメントを追加
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
