"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  userId: string;
  currentRole: "ADMIN" | "MEMBER";
  isActive: boolean;
  isSelf: boolean;
};

export function UserActions({ userId, currentRole, isActive, isSelf }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRoleChange() {
    const newRole = currentRole === "ADMIN" ? "MEMBER" : "ADMIN";
    const label = newRole === "ADMIN" ? "adminに昇格" : "memberに変更";
    if (!confirm(`このユーザーを${label}しますか？`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error?.message ?? "ロールの変更に失敗しました");
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive() {
    const label = isActive ? "無効化" : "有効化";
    if (!confirm(`このユーザーを${label}しますか？`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error?.message ?? `${label}に失敗しました`);
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("このユーザーを削除しますか？この操作は取り消せません。")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
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

  if (isSelf) {
    return <span className="text-xs text-gray-400">（自分）</span>;
  }

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={handleRoleChange}
        disabled={loading || !isActive}
        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {currentRole === "ADMIN" ? "member に変更" : "admin に昇格"}
      </button>
      <button
        type="button"
        onClick={handleToggleActive}
        disabled={loading}
        className={
          isActive
            ? "rounded border border-yellow-400 px-2 py-1 text-xs text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
            : "rounded border border-green-400 px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
        }
      >
        {isActive ? "無効化" : "有効化"}
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
