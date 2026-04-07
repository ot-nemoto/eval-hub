"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import {
  createEvaluationAssignment,
  deleteEvaluationAssignment,
} from "@/lib/evaluation-assignments";

export async function createEvaluationAssignmentAction(data: {
  fiscalYear: number;
  evaluateeId: string;
  evaluatorId: string;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") return { error: "権限がありません" };

  try {
    await createEvaluationAssignment(data);
  } catch (e) {
    if (e instanceof BadRequestError || e instanceof ConflictError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/evaluation-assignments");
  return {};
}

export async function deleteEvaluationAssignmentAction(
  id: string,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") return { error: "権限がありません" };

  try {
    await deleteEvaluationAssignment(id);
  } catch (e) {
    if (e instanceof NotFoundError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/evaluation-assignments");
  return {};
}
