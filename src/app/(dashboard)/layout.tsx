import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { FiscalYearSelector } from "@/components/FiscalYearSelector";
import { AppIcon } from "@/components/icons/AppIcon";
import { LogoutButton } from "@/components/LogoutButton";
import { NavLinks } from "@/components/NavLinks";
import { SettingsModalTrigger } from "@/components/SettingsModalTrigger";
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

  const [years, currentYear, dbUser] = await Promise.all([
    getFiscalYears(),
    getCurrentFiscalYear(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, apiKey: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="flex items-center gap-1.5 text-base font-bold text-zinc-900">
              <AppIcon width={28} height={28} />
              {APP_NAME}
            </h1>
            <NavLinks role={session.user.role} />
          </div>
          <div className="flex items-center gap-4">
            <FiscalYearSelector years={years} currentYear={currentYear} />
            <SettingsModalTrigger
              name={session.user.name}
              email={dbUser?.email ?? ""}
              hasInitialApiKey={dbUser?.apiKey != null}
            />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
