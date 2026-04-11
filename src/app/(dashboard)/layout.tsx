import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { FiscalYearSelector } from "@/components/FiscalYearSelector";
import { LogoutButton } from "@/components/LogoutButton";
import { NavLinks } from "@/components/NavLinks";
import { ProfileNameEditor } from "@/components/ProfileNameEditor";
import { getSession } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { getCurrentFiscalYear } from "@/lib/fiscal-year";
import { getFiscalYears } from "@/lib/fiscal-years";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    const { userId } = await auth();
    if (userId) {
      // isActive=false のユーザーは専用メッセージページへ
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { isActive: true },
      });
      if (user && !user.isActive) redirect("/auth-error?reason=inactive");
      // それ以外（Clerk ID 競合など）は汎用エラーページへ
      redirect("/auth-error");
    }
    redirect("/login");
  }

  const [years, currentYear] = await Promise.all([getFiscalYears(), getCurrentFiscalYear()]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-gray-900">{APP_NAME}</h1>
            <NavLinks role={session.user.role} />
          </div>
          <div className="flex items-center gap-4">
            <FiscalYearSelector years={years} currentYear={currentYear} />
            <ProfileNameEditor name={session.user.name} />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
