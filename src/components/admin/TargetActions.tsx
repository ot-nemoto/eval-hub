"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Target = { id: number; name: string; no: number };
type Props = { target: Target; canDelete: boolean };

export function TargetActions({ target, canDelete }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: target.name, no: String(target.no) });

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/targets/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, no: Number(form.no) }),
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
    if (!confirm(`大分類「${target.name}」を削除しますか？`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/targets/${target.id}`, { method: "DELETE" });
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
      <form onSubmit={handleEdit} className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={form.no}
          onChange={(e) => setForm((p) => ({ ...p, no: e.target.value }))}
          className="w-16 rounded border border-gray-300 px-2 py-1 text-xs"
          placeholder="No"
          required
        />
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
          placeholder="名称"
          required
        />
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
      </form>
    );
  }

  return (
    <div className="flex gap-2">
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
        disabled={loading || !canDelete}
        title={canDelete ? undefined : "紐づく中分類があるため削除できません"}
        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        削除
      </button>
    </div>
  );
}
