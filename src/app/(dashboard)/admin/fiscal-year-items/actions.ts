"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import {
  addFiscalYearItem,
  assertFiscalYearUnlocked,
  copyFiscalYearItems,
  removeFiscalYearItem,
} from "@/lib/fiscal-years";

export async function toggleFiscalYearItemAction(
  year: number,
  itemId: number,
  checked: boolean,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  if (!Number.isInteger(year) || year < 1900 || year > 9999)
    return { error: "year は 1900〜9999 の整数で指定してください" };
  if (!Number.isInteger(itemId) || itemId < 1)
    return { error: "itemId は正の整数で指定してください" };

  const lockCheck = await assertFiscalYearUnlocked(year);
  if (lockCheck) return lockCheck;

  try {
    if (checked) {
      await addFiscalYearItem(year, itemId);
    } else {
      await removeFiscalYearItem(year, itemId);
    }
  } catch (e) {
    if (e instanceof BadRequestError || e instanceof NotFoundError || e instanceof ConflictError)
      return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/fiscal-year-items");
  return {};
}

export async function copyFiscalYearItemsAction(
  targetYear: number,
  sourceYear: number,
): Promise<{ error?: string; copiedCount?: number }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  if (!Number.isInteger(targetYear) || targetYear < 1900 || targetYear > 9999)
    return { error: "targetYear は 1900〜9999 の整数で指定してください" };
  if (!Number.isInteger(sourceYear) || sourceYear < 1900 || sourceYear > 9999)
    return { error: "sourceYear は 1900〜9999 の整数で指定してください" };

  try {
    const result = await copyFiscalYearItems(targetYear, sourceYear);
    revalidatePath("/admin/fiscal-year-items");
    return { copiedCount: result.copiedCount };
  } catch (e) {
    if (e instanceof BadRequestError || e instanceof NotFoundError || e instanceof ConflictError)
      return { error: e.message };
    throw e;
  }
}
