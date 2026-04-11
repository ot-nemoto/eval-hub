"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FISCAL_YEAR_COOKIE } from "@/lib/fiscal-year";
import { BadRequestError } from "@/lib/errors";
import { updateUserName } from "@/lib/users";

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

export async function updateNameAction(name: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    await updateUserName(session.user.id, name);
  } catch (e) {
    if (e instanceof BadRequestError) return { error: e.message };
    throw e;
  }

  revalidatePath("/", "layout");
  return {};
}
