"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { upsertEvaluationSetting } from "@/lib/evaluation-settings";
import { BadRequestError, NotFoundError } from "@/lib/errors";

export async function upsertEvaluationSettingAction(
  userId: string,
  fiscalYear: number,
  data: { selfEvaluationEnabled: boolean },
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    await upsertEvaluationSetting(userId, fiscalYear, data);
  } catch (e) {
    if (e instanceof BadRequestError || e instanceof NotFoundError) return { error: e.message };
    throw e;
  }

  revalidatePath(`/admin/users/${userId}/evaluation-settings`);
  return {};
}
