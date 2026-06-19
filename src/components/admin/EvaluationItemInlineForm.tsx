"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEvaluationItemAction } from "@/app/(dashboard)/admin/targets/actions";

type Props = {
  targetId: number;
  categoryId: number;
};

export function EvaluationItemInlineForm({ targetId, categoryId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", evalCriteria: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createEvaluationItemAction({
        targetId,
        categoryId,
        name: form.name,
        description: form.description || null,
        evalCriteria: form.evalCriteria || null,
      });
      if (!result.error) {
        setOpen(false);
        setForm({ name: "", description: "", evalCriteria: "" });
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
      >
        ＋ 評価項目を追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded border bg-white p-3 space-y-2">
      <div>
        <label htmlFor={`item-name-${categoryId}`} className="block text-xs font-medium text-gray-600 mb-0.5">
          名称 <span className="text-red-500">*</span>
        </label>
        <input
          id={`item-name-${categoryId}`}
          name="name"
          type="text"
          required
          value={form.name}
          onChange={handleChange}
          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor={`item-desc-${categoryId}`} className="block text-xs font-medium text-gray-600 mb-0.5">
          説明
        </label>
        <textarea
          id={`item-desc-${categoryId}`}
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={2}
          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor={`item-criteria-${categoryId}`} className="block text-xs font-medium text-gray-600 mb-0.5">
          評価基準
        </label>
        <textarea
          id={`item-criteria-${categoryId}`}
          name="evalCriteria"
          value={form.evalCriteria}
          onChange={handleChange}
          rows={2}
          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-zinc-700 px-3 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          追加
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={loading}
          className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
