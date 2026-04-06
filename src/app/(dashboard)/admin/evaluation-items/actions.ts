"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import {
  createEvaluationItem,
  deleteEvaluationItem,
  updateEvaluationItem,
} from "@/lib/evaluation-items";

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
    if (e instanceof NotFoundError || e instanceof BadRequestError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/evaluation-items");
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

  revalidatePath("/admin/evaluation-items");
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

  revalidatePath("/admin/evaluation-items");
  return {};
}
