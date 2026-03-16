import { auth, signOut } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-gray-900">評価ハブ</h1>
            <nav className="flex gap-4 text-sm">
              <Link href="/evaluations" className="text-gray-600 hover:text-gray-900">
                自己評価
              </Link>
              <Link href="/members" className="text-gray-600 hover:text-gray-900">
                社員一覧
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user.name}</span>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="cursor-pointer text-sm text-gray-500 hover:text-gray-700"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
