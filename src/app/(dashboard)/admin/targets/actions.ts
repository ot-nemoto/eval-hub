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

  if (typeof data.name !== "string" || !data.name.trim())
    return { error: "name は必須です" };
  if (!Number.isInteger(data.no) || data.no < 1)
    return { error: "no は 1 以上の整数で指定してください" };

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

  if (!Number.isInteger(id) || id < 1)
    return { error: "id は 1 以上の整数で指定してください" };
  if (data.name !== undefined && (typeof data.name !== "string" || !data.name.trim()))
    return { error: "name が不正です" };
  if (data.no !== undefined && (!Number.isInteger(data.no) || data.no < 1))
    return { error: "no は 1 以上の整数で指定してください" };
  if (data.name === undefined && data.no === undefined)
    return { error: "更新可能なフィールドが指定されていません" };

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

  if (!Number.isInteger(id) || id < 1)
    return { error: "id は 1 以上の整数で指定してください" };

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

  if (!Number.isInteger(data.targetId) || data.targetId < 1)
    return { error: "targetId は 1 以上の整数で指定してください" };
  if (typeof data.name !== "string" || !data.name.trim())
    return { error: "name は必須です" };
  if (!Number.isInteger(data.no) || data.no < 1)
    return { error: "no は 1 以上の整数で指定してください" };

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

  if (!Number.isInteger(id) || id < 1)
    return { error: "id は 1 以上の整数で指定してください" };
  if (data.name !== undefined && (typeof data.name !== "string" || !data.name.trim()))
    return { error: "name が不正です" };
  if (data.no !== undefined && (!Number.isInteger(data.no) || data.no < 1))
    return { error: "no は 1 以上の整数で指定してください" };
  if (data.name === undefined && data.no === undefined)
    return { error: "更新可能なフィールドが指定されていません" };

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

  if (!Number.isInteger(id) || id < 1)
    return { error: "id は 1 以上の整数で指定してください" };

  try {
    await deleteCategory(id);
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ConflictError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/targets");
  return {};
}
