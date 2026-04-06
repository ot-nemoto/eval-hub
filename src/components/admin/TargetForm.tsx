"use client";

import { useState } from "react";
import { createTargetAction } from "@/app/(dashboard)/admin/targets/actions";

export function TargetForm() {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", no: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createTargetAction({ name: form.name, no: Number(form.no) });
      if (!result.error) {
        setOpen(false);
        setForm({ name: "", no: "" });
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
        className="rounded border border-blue-300 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
      >
        ＋ 大分類を追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div>
        <label htmlFor="target-no" className="mb-1 block text-xs font-medium text-gray-700">
          No
        </label>
        <input
          id="target-no"
          type="number"
          min={1}
          required
          value={form.no}
          onChange={(e) => setForm((p) => ({ ...p, no: e.target.value }))}
          className="w-16 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          placeholder="1"
        />
      </div>
      <div>
        <label htmlFor="target-name" className="mb-1 block text-xs font-medium text-gray-700">
          名称
        </label>
        <input
          id="target-name"
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          placeholder="大分類名"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        追加
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setForm({ name: "", no: "" });
        }}
        disabled={loading}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        キャンセル
      </button>
    </form>
  );
}
