"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { targetId: number };

export function CategoryForm({ targetId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", no: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_id: targetId, name: form.name, no: Number(form.no) }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ name: "", no: "" });
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error?.message ?? "追加に失敗しました");
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
        className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
      >
        ＋ 中分類を追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">No</label>
        <input
          type="number"
          min={1}
          required
          value={form.no}
          onChange={(e) => setForm((p) => ({ ...p, no: e.target.value }))}
          className="w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
          placeholder="1"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">名称</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
          placeholder="engagement"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
      >
        追加
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setForm({ name: "", no: "" }); }}
        disabled={loading}
        className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        キャンセル
      </button>
    </form>
  );
}
