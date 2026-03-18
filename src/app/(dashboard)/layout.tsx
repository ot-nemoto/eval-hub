import { SignOutButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { NavLinks } from "@/components/NavLinks";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    const { userId } = await auth();
    // Clerk セッションはあるが DB セッションが取得できない場合は競合エラーページへ
    if (userId) redirect("/auth-error");
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-gray-900">評価ハブ</h1>
            <NavLinks />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user.name}</span>
            <SignOutButton redirectUrl="/login">
              <button
                type="button"
                className="cursor-pointer text-sm text-gray-500 hover:text-gray-700"
              >
                ログアウト
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
