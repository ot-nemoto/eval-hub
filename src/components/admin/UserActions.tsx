"use client";

import { useState } from "react";

import { deleteUserAction, updateUserAction } from "@/app/(dashboard)/admin/users/actions";

type Props = {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
  isDeletable: boolean;
};

export function UserActions({ userId, isActive, isSelf, isDeletable }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleToggleActive() {
    const label = isActive ? "無効化" : "有効化";
    if (!confirm(`このユーザーを${label}しますか？`)) return;

    setLoading(true);
    try {
      const result = await updateUserAction(userId, { isActive: !isActive });
      if (result.error) alert(result.error);
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
      const result = await deleteUserAction(userId);
      if (result.error) alert(result.error);
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
        disabled={loading || !isDeletable}
        title={!isDeletable ? "評価データまたはアサインデータが存在するため削除できません" : undefined}
        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        削除
      </button>
    </div>
  );
}
