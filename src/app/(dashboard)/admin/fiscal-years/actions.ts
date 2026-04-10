"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import {
  addFiscalYearItem,
  createFiscalYear,
  deleteFiscalYear,
  removeFiscalYearItem,
  toggleFiscalYearLock,
  updateFiscalYear,
} from "@/lib/fiscal-years";

export async function createFiscalYearAction(data: {
  year: number;
  name: string;
  startDate: string;
  endDate: string;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  if (!Number.isInteger(data.year) || data.year < 1900 || data.year > 9999)
    return { error: "year は 1900〜9999 の整数で指定してください" };
  if (typeof data.name !== "string" || !data.name.trim())
    return { error: "name は必須です" };
  if (typeof data.startDate !== "string" || typeof data.endDate !== "string")
    return { error: "startDate, endDate は必須です" };

  try {
    await createFiscalYear(data);
  } catch (e) {
    if (e instanceof BadRequestError || e instanceof ConflictError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/fiscal-years");
  return {};
}

export async function updateFiscalYearAction(
  year: number,
  data: { name?: string; startDate?: string; endDate?: string; isCurrent?: boolean },
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  if (!Number.isInteger(year) || year < 1900 || year > 9999)
    return { error: "year は 1900〜9999 の整数で指定してください" };

  if (Object.keys(data).length === 0)
    return { error: "更新するフィールドを指定してください" };

  try {
    await updateFiscalYear(year, data);
  } catch (e) {
    if (e instanceof BadRequestError || e instanceof NotFoundError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/fiscal-years");
  return {};
}

export async function toggleFiscalYearLockAction(
  year: number,
  isLocked: boolean,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  if (!Number.isInteger(year) || year < 1900 || year > 9999)
    return { error: "year は 1900〜9999 の整数で指定してください" };

  try {
    await toggleFiscalYearLock(year, isLocked);
  } catch (e) {
    if (e instanceof NotFoundError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/fiscal-years");
  return {};
}

export async function deleteFiscalYearAction(year: number): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  if (!Number.isInteger(year) || year < 1900 || year > 9999)
    return { error: "year は 1900〜9999 の整数で指定してください" };

  try {
    await deleteFiscalYear(year);
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ConflictError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/fiscal-years");
  return {};
}

export async function addFiscalYearItemAction(
  year: number,
  itemId: number,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  if (!Number.isInteger(year) || year < 1900 || year > 9999)
    return { error: "year は 1900〜9999 の整数で指定してください" };
  if (!Number.isInteger(itemId) || itemId < 1)
    return { error: "evaluationItemId は正の整数で指定してください" };

  try {
    await addFiscalYearItem(year, itemId);
  } catch (e) {
    if (e instanceof BadRequestError || e instanceof NotFoundError || e instanceof ConflictError)
      return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/fiscal-years");
  return {};
}

export async function removeFiscalYearItemAction(
  year: number,
  itemId: number,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  if (!Number.isInteger(year) || year < 1900 || year > 9999)
    return { error: "year は 1900〜9999 の整数で指定してください" };
  if (!Number.isInteger(itemId) || itemId < 1)
    return { error: "itemId は正の整数で指定してください" };

  try {
    await removeFiscalYearItem(year, itemId);
  } catch (e) {
    if (e instanceof BadRequestError || e instanceof NotFoundError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/fiscal-years");
  return {};
}
