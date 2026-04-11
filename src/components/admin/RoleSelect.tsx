"use client";

import { useState } from "react";
import { updateUserAction } from "@/app/(dashboard)/admin/users/actions";

type Props = {
  userId: string;
  currentRole: "ADMIN" | "MEMBER";
  disabled: boolean;
};

export function RoleSelect({ userId, currentRole, disabled }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as "ADMIN" | "MEMBER";

    setLoading(true);
    try {
      const result = await updateUserAction(userId, { role: newRole });
      if (result.error) alert(result.error);
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={currentRole}
      onChange={handleChange}
      disabled={disabled || loading}
      aria-label="ロール"
      className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="ADMIN">ADMIN</option>
      <option value="MEMBER">MEMBER</option>
    </select>
  );
}
