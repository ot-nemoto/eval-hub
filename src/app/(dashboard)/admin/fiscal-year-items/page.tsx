import { redirect } from "next/navigation";

import { AdminYearSelector } from "@/components/admin/AdminYearSelector";
import { FiscalYearItemMatrix } from "@/components/admin/FiscalYearItemMatrix";
import { getSession } from "@/lib/auth";
import { getFiscalYears } from "@/lib/fiscal-years";
import { prisma } from "@/lib/prisma";

export default async function FiscalYearItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  const { year: yearParam } = await searchParams;

  const fiscalYears = await getFiscalYears();
  const currentFiscalYear = fiscalYears.find((fy) => fy.isCurrent) ?? fiscalYears[0] ?? null;

  const parsedYear = yearParam !== undefined ? Number(yearParam) : null;
  const selectedYear =
    parsedYear !== null && Number.isInteger(parsedYear) && parsedYear >= 1900 && parsedYear <= 9999
      ? parsedYear
      : (currentFiscalYear?.year ?? null);

  const selectedFiscalYear = fiscalYears.find((fy) => fy.year === selectedYear) ?? null;

  const [allItems, enabledItemIds] =
    selectedYear !== null
      ? await Promise.all([
          prisma.evaluationItem.findMany({
            select: {
              id: true,
              no: true,
              name: true,
              target: { select: { id: true, no: true, name: true } },
              category: { select: { id: true, no: true, name: true } },
            },
            orderBy: [{ target: { no: "asc" } }, { category: { no: "asc" } }, { no: "asc" }],
          }),
          prisma.fiscalYearItem
            .findMany({
              where: { fiscalYear: selectedYear },
              select: { evaluationItemId: true },
            })
            .then((items) => items.map((i) => i.evaluationItemId)),
        ])
      : [[], []];

  const previousYear =
    selectedYear !== null ? (fiscalYears.find((fy) => fy.year < selectedYear)?.year ?? null) : null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">年度別評価項目設定</h2>
        <p className="text-sm text-gray-500">年度ごとに有効な評価項目を設定します。</p>
      </div>

      <div className="mb-4">
        <AdminYearSelector
          basePath="/admin/fiscal-year-items"
          fiscalYears={fiscalYears.map((fy) => ({ year: fy.year, name: fy.name }))}
          selectedYear={selectedYear}
        />
      </div>

      {selectedYear !== null ? (
        <FiscalYearItemMatrix
          key={selectedYear}
          year={selectedYear}
          isLocked={selectedFiscalYear?.isLocked ?? false}
          allItems={allItems}
          enabledItemIds={enabledItemIds}
          previousYear={previousYear}
        />
      ) : (
        <div className="rounded-lg border bg-white px-4 py-8 text-center text-gray-500">
          年度を選択してください。
        </div>
      )}
    </div>
  );
}
