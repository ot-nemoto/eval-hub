import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MembersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = session.user.id;
  const isAdmin = session.user.role === "admin";
  const fiscalYear = new Date().getFullYear();

  type Member = { id: string; name: string; division: string | null };
  let members: Member[] = [];

  if (isAdmin) {
    members = await prisma.user.findMany({
      select: { id: true, name: true, division: true },
      orderBy: { name: "asc" },
    });
  } else {
    const assignments = await prisma.evaluationAssignment.findMany({
      where: { evaluator_id: userId, fiscal_year: fiscalYear },
      include: { evaluatee: { select: { id: true, name: true, division: true } } },
      orderBy: { evaluatee: { name: "asc" } },
    });
    members = assignments.map((a) => a.evaluatee);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">社員一覧</h2>
        <p className="text-sm text-gray-500">{fiscalYear}年度</p>
      </div>

      {members.length === 0 ? (
        <p className="text-gray-500">担当する被評価者がいません。</p>
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
                    <Link
                      href={`/members/${member.id}/evaluations`}
                      className="text-blue-600 hover:underline"
                    >
                      評価入力 →
                    </Link>
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
