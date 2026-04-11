"use client";

import { useRouter } from "next/navigation";

type FiscalYear = { year: number; name: string };

type Props = {
  fiscalYears: FiscalYear[];
  selectedYear: number | null;
};

export function EvaluationAssignmentYearSelector({ fiscalYears, selectedYear }: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/admin/evaluation-assignments?year=${e.target.value}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="year-selector" className="text-sm font-medium text-gray-700">
        年度：
      </label>
      <select
        id="year-selector"
        value={selectedYear ?? ""}
        onChange={handleChange}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
      >
        {fiscalYears.length === 0 && <option value="">年度が登録されていません</option>}
        {fiscalYears.map((fy) => (
          <option key={fy.year} value={fy.year}>
            {fy.name}
          </option>
        ))}
      </select>
    </div>
  );
}
