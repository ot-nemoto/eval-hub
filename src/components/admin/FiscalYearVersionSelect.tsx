"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  assignVersionAction,
  unassignVersionAction,
} from "@/app/(dashboard)/admin/fiscal-years/actions";

type Props = {
  year: number;
  isLocked: boolean;
  currentVersionId: number | null;
  versions: { id: number; name: string }[];
};

export function FiscalYearVersionSelect({ year, isLocked, currentVersionId, versions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    startTransition(async () => {
      try {
        const result = val
          ? await assignVersionAction(year, Number(val))
          : await unassignVersionAction(year);
        if (result.error) {
          alert(result.error);
        } else {
          router.refresh();
        }
      } catch {
        alert("通信エラーが発生しました");
      }
    });
  }

  return (
    <select
      value={currentVersionId ?? ""}
      onChange={handleChange}
      disabled={isLocked || pending}
      className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
    >
      <option value="">未設定</option>
      {versions.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name}
        </option>
      ))}
    </select>
  );
}
