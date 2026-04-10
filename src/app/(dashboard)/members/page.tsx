import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCurrentFiscalYear } from "@/lib/fiscal-year";
import { prisma } from "@/lib/prisma";

export default async function MembersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const fiscalYear = await getCurrentFiscalYear();
  if (!fiscalYear) redirect("/evaluations");

  type Member = { id: string; name: string; division: string | null };

  // ADMIN・MEMBER 共通: 対象年度の被評価者のみ表示
  const assignments = await prisma.evaluationAssignment.findMany({
    where: { fiscalYear },
    select: {
      evaluatorId: true,
      evaluateeId: true,
      evaluatee: { select: { id: true, name: true, division: true } },
    },
  });

  const evaluateeMap = new Map<string, Member>();
  for (const a of assignments) {
    evaluateeMap.set(a.evaluateeId, a.evaluatee);
  }

  // 対象年度に評価者または被評価者として関与している場合のみ一覧を表示
  const hasAccess =
    isAdmin ||
    assignments.some((a) => a.evaluatorId === userId || a.evaluateeId === userId);

  const members = hasAccess
    ? [...evaluateeMap.values()].sort((a, b) => a.name.localeCompare(b.name, "ja"))
    : [];

  // 現在ユーザーが評価者としてアサインされている被評価者 ID
  const assignedEvaluateeIds = new Set(
    isAdmin
      ? [...evaluateeMap.keys()] // admin は全被評価者を評価可能
      : assignments.filter((a) => a.evaluatorId === userId).map((a) => a.evaluateeId),
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">社員一覧</h2>
        <p className="text-sm text-gray-500">{fiscalYear}年度</p>
      </div>

      {members.length === 0 ? (
        <p className="text-gray-500">表示できる社員がいません。</p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">氏名</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">部署</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{member.name}</td>
                  <td className="px-4 py-3 text-gray-500">{member.division ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {member.id === userId ? (
                      <Link href="/evaluations" className="text-blue-600 hover:underline">
                        自己評価 →
                      </Link>
                    ) : (
                      <Link
                        href={`/members/${member.id}/evaluations`}
                        className="text-blue-600 hover:underline"
                      >
                        {assignedEvaluateeIds.has(member.id) ? "評価入力 →" : "閲覧 →"}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
