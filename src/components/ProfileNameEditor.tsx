"use client";

import React, { useRef, useState, useTransition } from "react";
import { updateNameAction } from "@/app/(dashboard)/actions";

export function ProfileNameEditor({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setValue(name);
    setError(null);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function save() {
    startTransition(async () => {
      try {
        const result = await updateNameAction(value);
        if (result.error) {
          setError(result.error);
          return;
        }
        setEditing(false);
        setError(null);
      } catch {
        setError(null);
        alert("通信エラーが発生しました");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        className="cursor-pointer text-sm text-gray-600 hover:underline"
        title="クリックして名前を変更"
      >
        {name}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="プロフィール名"
        disabled={isPending}
        className="rounded border border-gray-300 px-2 py-0.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
        style={{ width: `${Math.max(value.length, 4) + 4}ch` }}
      />
      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
      >
        保存
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={isPending}
        className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
      >
        キャンセル
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
