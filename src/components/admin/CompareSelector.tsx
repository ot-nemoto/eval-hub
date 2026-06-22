"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Version = { id: number; name: string };

type Props = {
  versions: Version[];
  leftValue: string;
  rightValue: string;
};

export function CompareSelector({ versions, leftValue, rightValue }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(side: "left" | "right", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(side, value);
    router.push(`/admin/targets/compare?${params.toString()}`);
  }

  const options = [
    { value: "current", label: "現在のマスタ" },
    ...versions.map((v) => ({ value: String(v.id), label: v.name })),
  ];

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="compare-left" className="text-sm font-medium text-gray-700">
          左:
        </label>
        <select
          id="compare-left"
          value={leftValue}
          onChange={(e) => handleChange("left", e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <span className="text-gray-400">⇔</span>
      <div className="flex items-center gap-2">
        <label htmlFor="compare-right" className="text-sm font-medium text-gray-700">
          右:
        </label>
        <select
          id="compare-right"
          value={rightValue}
          onChange={(e) => handleChange("right", e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
