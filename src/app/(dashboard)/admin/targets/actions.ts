"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { createCategory, deleteCategory, reorderCategories, updateCategory } from "@/lib/categories";
import {
  createEvaluationItem,
  deleteEvaluationItem,
  reorderEvaluationItems,
  updateEvaluationItem,
} from "@/lib/evaluation-items";
import { createTarget, deleteTarget, reorderTargets, updateTarget } from "@/lib/targets";

// ---- 大分類 ----

export async function createTargetAction(data: {
  name: string;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  if (typeof data.name !== "string" || !data.name.trim())
    return { error: "name は必須です" };

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
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  if (!Number.isInteger(data.targetId) || data.targetId < 1)
    return { error: "targetId は 1 以上の整数で指定してください" };
  if (typeof data.name !== "string" || !data.name.trim())
    return { error: "name は必須です" };

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

// ---- 並び替え ----

export async function reorderTargetsAction(
  orders: { id: number; no: number }[],
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    await reorderTargets(orders);
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ConflictError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/targets");
  return {};
}

export async function reorderCategoriesAction(
  orders: { id: number; no: number }[],
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    await reorderCategories(orders);
  } catch (e) {
    if (e instanceof NotFoundError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/targets");
  return {};
}

export async function reorderEvaluationItemsAction(
  orders: { id: number; no: number }[],
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    await reorderEvaluationItems(orders);
  } catch (e) {
    if (e instanceof NotFoundError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/targets");
  return {};
}

// ---- 評価項目 CRUD ----

export async function createEvaluationItemAction(data: {
  targetId: number;
  categoryId: number;
  name: string;
  description?: string | null;
  evalCriteria?: string | null;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  if (!Number.isInteger(data.targetId) || data.targetId < 1)
    return { error: "targetId は 1 以上の整数で指定してください" };
  if (!Number.isInteger(data.categoryId) || data.categoryId < 1)
    return { error: "categoryId は 1 以上の整数で指定してください" };
  if (typeof data.name !== "string" || !data.name.trim())
    return { error: "name は必須です" };

  try {
    await createEvaluationItem(data);
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof BadRequestError || e instanceof ConflictError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/targets");
  return {};
}

export async function updateEvaluationItemAction(
  id: number,
  data: { name?: string; description?: string | null; evalCriteria?: string | null },
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  if (!Number.isInteger(id) || id < 1)
    return { error: "id は 1 以上の整数で指定してください" };
  if (data.name !== undefined && (typeof data.name !== "string" || !data.name.trim()))
    return { error: "name は空にできません" };
  if (data.name === undefined && !("description" in data) && !("evalCriteria" in data))
    return { error: "更新するフィールドを指定してください" };

  try {
    await updateEvaluationItem(id, data);
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof BadRequestError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/targets");
  return {};
}

export async function deleteEvaluationItemAction(id: number): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  if (!Number.isInteger(id) || id < 1)
    return { error: "id は 1 以上の整数で指定してください" };

  try {
    await deleteEvaluationItem(id);
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ConflictError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/targets");
  return {};
}
