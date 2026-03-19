"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FiscalYearForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ year: "", name: "", start_date: "", end_date: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // year 入力時に name を自動補完
      if (name === "year" && value) {
        next.name = `${value}年度`;
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fiscal-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(form.year),
          name: form.name,
          start_date: form.start_date,
          end_date: form.end_date,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ year: "", name: "", start_date: "", end_date: "" });
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error?.message ?? "年度の追加に失敗しました");
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
        className="rounded border border-blue-400 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
      >
        ＋ 年度を追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-4">
      <h3 className="mb-4 font-medium text-gray-900">新しい年度を追加</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="year" className="mb-1 block text-xs font-medium text-gray-700">
            年度（西暦）
          </label>
          <input
            id="year"
            name="year"
            type="number"
            required
            value={form.year}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
            placeholder="2028"
          />
        </div>
        <div>
          <label htmlFor="name" className="mb-1 block text-xs font-medium text-gray-700">
            名称
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
            placeholder="2028年度"
          />
        </div>
        <div>
          <label htmlFor="start_date" className="mb-1 block text-xs font-medium text-gray-700">
            開始日
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            value={form.start_date}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="end_date" className="mb-1 block text-xs font-medium text-gray-700">
            終了日
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            required
            value={form.end_date}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          追加
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={loading}
          className="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
