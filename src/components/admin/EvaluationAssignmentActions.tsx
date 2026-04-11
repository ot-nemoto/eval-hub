"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteEvaluationAssignmentAction } from "@/app/(dashboard)/admin/evaluation-assignments/actions";

type Props = {
  id: string;
  hasEvaluations: boolean;
  label: string;
};

export function EvaluationAssignmentActions({ id, hasEvaluations, label }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const message = hasEvaluations
      ? `「${label}」には評価データが存在します。アサインを削除しても評価データは残ります。削除しますか？`
      : `「${label}」のアサインを削除しますか？`;
    if (!confirm(message)) return;

    setLoading(true);
    try {
      const result = await deleteEvaluationAssignmentAction(id);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      削除
    </button>
  );
}
