"use client";

import { useState } from "react";

import { upsertEvaluationSettingAction } from "@/app/(dashboard)/admin/users/[id]/evaluation-settings/actions";

type Props = {
  userId: string;
  fiscalYear: number;
  enabled: boolean;
};

export function EvaluationSettingToggle({ userId, fiscalYear, enabled }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const result = await upsertEvaluationSettingAction(userId, fiscalYear, {
        selfEvaluationEnabled: !enabled,
      });
      if (result.error) alert(result.error);
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
        enabled ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
