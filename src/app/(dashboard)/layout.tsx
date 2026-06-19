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
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="flex items-center gap-1.5 text-base font-bold text-zinc-900">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="26" y1="4" x2="26" y2="8" strokeWidth="2"/>
                <path d="M14 16 L26 8 L38 16 L40 20 L12 20 Z" strokeWidth="2.5" fill="none"/>
                <path d="M10 30 L26 20 L42 30 L44 35 L8 35 Z" strokeWidth="2.5" fill="none"/>
                <line x1="8" y1="35" x2="44" y2="35" strokeWidth="2"/>
                <rect x="18" y="35" width="16" height="12" strokeWidth="2.5" fill="none"/>
                <line x1="8" y1="47" x2="44" y2="47" strokeWidth="2.5"/>
              </svg>
              {APP_NAME}
            </h1>
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
