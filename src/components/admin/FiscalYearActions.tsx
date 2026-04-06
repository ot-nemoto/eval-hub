"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteFiscalYearAction,
  updateFiscalYearAction,
} from "@/app/(dashboard)/admin/fiscal-years/actions";

type FiscalYear = {
  year: number;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
};

type Props = { fiscalYear: FiscalYear };

export function FiscalYearActions({ fiscalYear }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: fiscalYear.name,
    startDate: fiscalYear.startDate.toISOString().slice(0, 10),
    endDate: fiscalYear.endDate.toISOString().slice(0, 10),
  });

  async function handleSetCurrent() {
    if (!confirm(`${fiscalYear.name}を現在年度に設定しますか？`)) return;
    setLoading(true);
    try {
      const result = await updateFiscalYearAction(fiscalYear.year, { isCurrent: true });
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await updateFiscalYearAction(fiscalYear.year, form);
      if (result.error) {
        alert(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`${fiscalYear.name}を削除しますか？この操作は取り消せません。`)) return;
    setLoading(true);
    try {
      const result = await deleteFiscalYearAction(fiscalYear.year);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleEdit} className="flex items-center gap-2">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
          placeholder="名称"
          required
        />
        <input
          type="date"
          value={form.startDate}
          onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
          required
        />
        <input
          type="date"
          value={form.endDate}
          onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
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
    <div className="flex justify-end gap-2">
      {!fiscalYear.isCurrent && (
        <button
          type="button"
          onClick={handleSetCurrent}
          disabled={loading}
          className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50"
        >
          現在年度に設定
        </button>
      )}
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
        disabled={loading}
        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        削除
      </button>
    </div>
  );
}
