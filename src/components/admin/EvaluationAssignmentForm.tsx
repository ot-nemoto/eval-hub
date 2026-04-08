"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createEvaluationAssignmentAction } from "@/app/(dashboard)/admin/evaluation-assignments/actions";

type User = { id: string; name: string };

type Props = {
  fiscalYear: number;
  users: User[];
};

export function EvaluationAssignmentForm({ fiscalYear, users }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [evaluateeId, setEvaluateeId] = useState("");
  const [evaluatorId, setEvaluatorId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createEvaluationAssignmentAction({
        fiscalYear,
        evaluateeId,
        evaluatorId,
      });
      if (result.error) {
        alert(result.error);
      } else {
        setOpen(false);
        setEvaluateeId("");
        setEvaluatorId("");
        router.refresh();
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-blue-400 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
      >
        ＋ アサインを追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-4">
      <h3 className="mb-4 font-medium text-gray-900">
        {fiscalYear}年度 — 新しいアサインを追加
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="evaluateeId" className="mb-1 block text-xs font-medium text-gray-700">
            被評価者
          </label>
          <select
            id="evaluateeId"
            required
            value={evaluateeId}
            onChange={(e) => setEvaluateeId(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="">選択してください</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="evaluatorId" className="mb-1 block text-xs font-medium text-gray-700">
            評価者
          </label>
          <select
            id="evaluatorId"
            required
            value={evaluatorId}
            onChange={(e) => setEvaluatorId(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="">選択してください</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          追加
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={loading}
          className="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
