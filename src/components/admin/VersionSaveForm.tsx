"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createEvalItemVersionAction } from "@/app/(dashboard)/admin/targets/actions";

export function VersionSaveForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await createEvalItemVersionAction(name);
        if (result.error) {
          setError(result.error);
        } else {
          setName("");
          router.refresh();
        }
      } catch {
        alert("通信エラーが発生しました");
      }
    });
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">バージョン保存</h3>
      <p className="mb-3 text-xs text-gray-500">
        現在の評価項目（作業スペース）の状態をバージョンとして保存します。
      </p>
      {error && <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="バージョン名（例: 2026年度版）"
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          disabled={saving}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}
