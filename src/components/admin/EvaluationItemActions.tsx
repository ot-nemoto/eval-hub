"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteEvaluationItemAction,
  updateEvaluationItemAction,
} from "@/app/(dashboard)/admin/targets/actions";

type EvaluationItem = {
  id: number;
  no: number;
  name: string;
  description: string | null;
  evalCriteria: string | null;
};

type Props = { item: EvaluationItem };

export function EvaluationItemActions({ item }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    no: String(item.no),
    name: item.name,
    description: item.description ?? "",
    evalCriteria: item.evalCriteria ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const noValue = Number(form.no);
      if (!Number.isInteger(noValue) || noValue < 1) {
        alert("No は 1 以上の整数で指定してください");
        setLoading(false);
        return;
      }
      const result = await updateEvaluationItemAction(item.id, {
        no: noValue !== item.no ? noValue : undefined,
        name: form.name,
        description: form.description || null,
        evalCriteria: form.evalCriteria || null,
      });
      if (!result.error) {
        setEditing(false);
        router.refresh();
      } else {
        alert(result.error);
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
      const result = await deleteEvaluationItemAction(item.id);
      if (!result.error) {
        router.refresh();
      } else {
        alert(result.error);
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
          type="number"
          name="no"
          value={form.no}
          onChange={handleChange}
          placeholder="No"
          required
          min={1}
          className="rounded border border-gray-300 px-2 py-1 text-xs w-20"
        />
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
          name="evalCriteria"
          value={form.evalCriteria}
          onChange={handleChange}
          placeholder="評価基準"
          rows={2}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded border border-zinc-400 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
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
        disabled={loading}
        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
      >
        削除
      </button>
    </div>
  );
}
