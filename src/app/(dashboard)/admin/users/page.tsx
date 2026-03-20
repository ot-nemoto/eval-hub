import Link from "next/link";
import { redirect } from "next/navigation";
import { UserActions } from "@/components/admin/UserActions";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/evaluations");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      division: true,
      joinedAt: true,
      createdAt: true,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">ユーザー管理</h2>
        <p className="text-sm text-gray-500">{users.length} 件</p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">氏名</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">メールアドレス</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">部署</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">ロール</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">登録日</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">自己評価設定</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr
                key={user.id}
                className={user.isActive ? "hover:bg-gray-50" : "bg-gray-50 opacity-60"}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3 text-gray-500">{user.division ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      user.role === "admin"
                        ? "inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                        : "inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                    }
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {user.createdAt.toLocaleDateString("ja-JP")}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${user.id}/evaluation-settings`}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    設定 →
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <UserActions
                    userId={user.id}
                    currentRole={user.role}
                    isActive={user.isActive}
                    isSelf={user.id === session.user.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
