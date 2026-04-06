"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { createCategory, deleteCategory, updateCategory } from "@/lib/categories";
import { createTarget, deleteTarget, updateTarget } from "@/lib/targets";

// ---- 大分類 ----

export async function createTargetAction(data: {
  name: string;
  no: number;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    await createTarget(data);
  } catch (e) {
    if (e instanceof ConflictError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/targets");
  return {};
}

export async function updateTargetAction(
  id: number,
  data: { name?: string; no?: number },
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    await updateTarget(id, data);
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ConflictError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/targets");
  return {};
}

export async function deleteTargetAction(id: number): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    await deleteTarget(id);
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ConflictError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/targets");
  return {};
}

// ---- 中分類 ----

export async function createCategoryAction(data: {
  targetId: number;
  name: string;
  no: number;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    await createCategory(data);
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ConflictError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/targets");
  return {};
}

export async function updateCategoryAction(
  id: number,
  data: { name?: string; no?: number },
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    await updateCategory(id, data);
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ConflictError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/targets");
  return {};
}

export async function deleteCategoryAction(id: number): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    await deleteCategory(id);
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ConflictError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/targets");
  return {};
}
