"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EvaluationItem = {
  uid: string;
  name: string;
  description: string | null;
  eval_criteria: string | null;
  two_year_rule: boolean;
};

type Props = { item: EvaluationItem; hasEvaluations: boolean };

export function EvaluationItemActions({ item, hasEvaluations }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: item.name,
    description: item.description ?? "",
    eval_criteria: item.eval_criteria ?? "",
    two_year_rule: item.two_year_rule,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/evaluation-items/${item.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          eval_criteria: form.eval_criteria || null,
          two_year_rule: form.two_year_rule,
        }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error?.message ?? "更新に失敗しました");
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`「${item.name}」を削除しますか？この操作は取り消せません。`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/evaluation-items/${item.uid}`, { method: "DELETE" });
      if (res.status === 204) {
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error?.message ?? "削除に失敗しました");
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleEdit} className="flex flex-col gap-2 py-1">
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="名称"
          required
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        />
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="説明"
          rows={2}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        />
        <textarea
          name="eval_criteria"
          value={form.eval_criteria}
          onChange={handleChange}
          placeholder="評価基準"
          rows={2}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        />
        <label className="flex items-center gap-1 text-xs text-gray-700">
          <input
            type="checkbox"
            name="two_year_rule"
            checked={form.two_year_rule}
            onChange={handleChange}
            className="rounded border-gray-300"
          />
          ２年ルール
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded border border-blue-400 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={loading}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            キャンセル
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={loading}
        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        編集
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading || hasEvaluations}
        title={hasEvaluations ? "年度に紐づいているため削除できません" : undefined}
        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
      >
        削除
      </button>
    </div>
  );
}
