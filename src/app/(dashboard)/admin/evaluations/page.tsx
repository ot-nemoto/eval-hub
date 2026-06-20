import { redirect } from "next/navigation";

import { AdminYearSelector } from "@/components/admin/AdminYearSelector";
import { EvaluationMatrix } from "@/components/admin/EvaluationMatrix";
import { getSession } from "@/lib/auth";
import { getEvaluationMatrix } from "@/lib/evaluations";
import { getFiscalYears } from "@/lib/fiscal-years";

export default async function AdminEvaluationsPage({
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
    parsedYear !== null &&
    Number.isInteger(parsedYear) &&
    parsedYear >= 1900 &&
    parsedYear <= 9999
      ? parsedYear
      : (currentFiscalYear?.year ?? null);

  const matrix = selectedYear !== null ? await getEvaluationMatrix(selectedYear) : null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">評価一覧</h2>
        <p className="text-sm text-gray-500">全社員の評価をマトリクス形式で確認できます。</p>
      </div>

      <div className="mb-4">
        <AdminYearSelector
          basePath="/admin/evaluations"
          fiscalYears={fiscalYears.map((fy) => ({ year: fy.year, name: fy.name }))}
          selectedYear={selectedYear}
        />
      </div>

      {matrix ? (
        <EvaluationMatrix users={matrix.users} rows={matrix.rows} />
      ) : (
        <div className="rounded-lg border bg-white px-4 py-8 text-center text-gray-500">
          年度を選択してください。
        </div>
      )}
    </div>
  );
}
