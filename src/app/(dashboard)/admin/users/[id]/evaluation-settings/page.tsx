import Link from "next/link";
import { redirect } from "next/navigation";
import { EvaluationSettingToggle } from "@/components/admin/EvaluationSettingToggle";
import { getSession } from "@/lib/auth";
import { getEvaluationSettings } from "@/lib/evaluation-settings";
import { prisma } from "@/lib/prisma";

export default async function UserEvaluationSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
  if (!user) redirect("/admin/users");

  const [fiscalYears, settings] = await Promise.all([
    prisma.fiscalYear.findMany({ orderBy: { year: "desc" }, select: { year: true } }),
    getEvaluationSettings(id),
  ]);

  const settingMap = new Map(settings.map((s) => [s.fiscalYear, s.selfEvaluationEnabled]));

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/users" className="text-sm text-blue-600 hover:underline">
          ← ユーザー管理に戻る
        </Link>
        <h2 className="mt-2 text-xl font-bold text-gray-900">自己評価要否設定</h2>
        <p className="text-sm text-gray-500">
          {user.name}（{user.email}）
        </p>
      </div>

      {fiscalYears.length === 0 ? (
        <p className="text-gray-500">設定可能な年度がありません。</p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">年度</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">自己評価</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fiscalYears.map(({ year }) => {
                // 未設定の場合はデフォルト false（自己評価なし）
                const enabled = settingMap.get(year) ?? false;
                return (
                  <tr key={year} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{year}年度</td>
                    <td className="px-4 py-3">
                      <EvaluationSettingToggle userId={id} fiscalYear={year} enabled={enabled} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{enabled ? "必要" : "不要"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
