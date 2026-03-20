"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Target = { id: number; name: string };
type Category = { id: number; target_id: number; name: string };

type Props = {
  targets: Target[];
  categories: Category[];
};

export function EvaluationItemForm({ targets, categories }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    target_id: "",
    category_id: "",
    name: "",
    description: "",
    eval_criteria: "",
  });

  const filteredCategories = form.target_id
    ? categories.filter((c) => c.target_id === Number(form.target_id))
    : [];

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    if (name === "target_id") {
      setForm((prev) => ({ ...prev, target_id: value, category_id: "" }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/evaluation-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_id: Number(form.target_id),
          category_id: Number(form.category_id),
          name: form.name,
          description: form.description || null,
          eval_criteria: form.eval_criteria || null,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ target_id: "", category_id: "", name: "", description: "", eval_criteria: "" });
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error?.message ?? "評価項目の追加に失敗しました");
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
        ＋ 評価項目を追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-4">
      <h3 className="mb-4 font-medium text-gray-900">新しい評価項目を追加</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="target_id" className="mb-1 block text-xs font-medium text-gray-700">
            大分類 <span className="text-red-500">*</span>
          </label>
          <select
            id="target_id"
            name="target_id"
            required
            value={form.target_id}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="">選択してください</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="category_id" className="mb-1 block text-xs font-medium text-gray-700">
            中分類 <span className="text-red-500">*</span>
          </label>
          <select
            id="category_id"
            name="category_id"
            required
            value={form.category_id}
            onChange={handleChange}
            disabled={!form.target_id}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">選択してください</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor="name" className="mb-1 block text-xs font-medium text-gray-700">
            名称 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div className="col-span-2">
          <label htmlFor="description" className="mb-1 block text-xs font-medium text-gray-700">
            説明
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={2}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div className="col-span-2">
          <label htmlFor="eval_criteria" className="mb-1 block text-xs font-medium text-gray-700">
            評価基準
          </label>
          <textarea
            id="eval_criteria"
            name="eval_criteria"
            value={form.eval_criteria}
            onChange={handleChange}
            rows={2}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
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
