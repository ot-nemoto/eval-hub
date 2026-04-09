"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FISCAL_YEAR_COOKIE } from "@/lib/fiscal-year";

export async function setFiscalYearAction(
  year: number,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "Invalid fiscal year" };
  }

  const cookieStore = await cookies();
  cookieStore.set(FISCAL_YEAR_COOKIE, String(year), { path: "/" });
  revalidatePath("/", "layout");
  return {};
}
