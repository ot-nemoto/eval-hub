"use client";
import { setFiscalYearAction } from "@/app/(dashboard)/actions";

type Props = {
  years: { year: number; name: string }[];
  currentYear: number | null;
};

export function FiscalYearSelector({ years, currentYear }: Props) {
  if (years.length === 0) return null;

  return (
    <select
      value={currentYear ?? ""}
      onChange={(e) => {
        const year = parseInt(e.target.value, 10);
        if (!isNaN(year)) setFiscalYearAction(year);
      }}
      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700"
    >
      {years.map((fy) => (
        <option key={fy.year} value={fy.year}>
          {fy.name}
        </option>
      ))}
    </select>
  );
}
