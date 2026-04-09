"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FISCAL_YEAR_COOKIE } from "@/lib/fiscal-year";

export async function setFiscalYearAction(year: number): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  cookieStore.set(FISCAL_YEAR_COOKIE, String(year), { path: "/" });
  revalidatePath("/", "layout");
}
