"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  userId: string;
  currentRole: "admin" | "member";
  isSelf: boolean;
};

export function UserActions({ userId, currentRole, isSelf }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRoleChange() {
    const newRole = currentRole === "admin" ? "member" : "admin";
    const label = newRole === "admin" ? "adminに昇格" : "memberに変更";
    if (!confirm(`このユーザーを${label}しますか？`)) return;

    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setLoading(false);

    if (res.ok) {
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      alert(json.error?.message ?? "ロールの変更に失敗しました");
    }
  }

  async function handleDelete() {
    if (!confirm("このユーザーを削除しますか？この操作は取り消せません。")) return;

    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setLoading(false);

    if (res.status === 204) {
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      alert(json.error?.message ?? "削除に失敗しました");
    }
  }

  if (isSelf) {
    return <span className="text-xs text-gray-400">（自分）</span>;
  }

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={handleRoleChange}
        disabled={loading}
        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {currentRole === "admin" ? "member に変更" : "admin に昇格"}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        削除
      </button>
    </div>
  );
}
