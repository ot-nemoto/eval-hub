"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EvaluationItemForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    uid: "",
    target: "",
    target_no: "",
    category: "",
    category_no: "",
    item_no: "",
    name: "",
    description: "",
    eval_criteria: "",
    two_year_rule: false,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/evaluation-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: form.uid,
          target: form.target,
          target_no: form.target_no ? Number(form.target_no) : null,
          category: form.category,
          category_no: form.category_no ? Number(form.category_no) : null,
          item_no: Number(form.item_no),
          name: form.name,
          description: form.description || null,
          eval_criteria: form.eval_criteria || null,
          two_year_rule: form.two_year_rule,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ uid: "", target: "", target_no: "", category: "", category_no: "", item_no: "", name: "", description: "", eval_criteria: "", two_year_rule: false });
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
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="uid" className="mb-1 block text-xs font-medium text-gray-700">
            UID <span className="text-red-500">*</span>
          </label>
          <input
            id="uid"
            name="uid"
            type="text"
            required
            value={form.uid}
            onChange={handleChange}
            placeholder="1-1-1"
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="target" className="mb-1 block text-xs font-medium text-gray-700">
            大分類 <span className="text-red-500">*</span>
          </label>
          <input
            id="target"
            name="target"
            type="text"
            required
            value={form.target}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="target_no" className="mb-1 block text-xs font-medium text-gray-700">
            大分類順
          </label>
          <input
            id="target_no"
            name="target_no"
            type="number"
            value={form.target_no}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-xs font-medium text-gray-700">
            中分類 <span className="text-red-500">*</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            required
            value={form.category}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="category_no" className="mb-1 block text-xs font-medium text-gray-700">
            中分類順
          </label>
          <input
            id="category_no"
            name="category_no"
            type="number"
            value={form.category_no}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="item_no" className="mb-1 block text-xs font-medium text-gray-700">
            項目番号 <span className="text-red-500">*</span>
          </label>
          <input
            id="item_no"
            name="item_no"
            type="number"
            required
            value={form.item_no}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div className="col-span-3">
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
        <div className="col-span-3">
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
        <div className="col-span-3">
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
        <div className="col-span-3 flex items-center gap-2">
          <input
            id="two_year_rule"
            name="two_year_rule"
            type="checkbox"
            checked={form.two_year_rule}
            onChange={handleChange}
            className="rounded border-gray-300"
          />
          <label htmlFor="two_year_rule" className="text-sm text-gray-700">
            ２年ルール
          </label>
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
