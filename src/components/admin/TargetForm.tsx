"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTargetAction } from "@/app/(dashboard)/admin/targets/actions";

export function TargetForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createTargetAction({ name });
      if (!result.error) {
        setOpen(false);
        setName("");
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
        className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
      >
        ＋ 大分類を追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div>
        <label htmlFor="target-name" className="mb-1 block text-xs font-medium text-gray-700">
          名称
        </label>
        <input
          id="target-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
          placeholder="大分類名"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-zinc-700 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        追加
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setName("");
        }}
        disabled={loading}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        キャンセル
      </button>
    </form>
  );
}
