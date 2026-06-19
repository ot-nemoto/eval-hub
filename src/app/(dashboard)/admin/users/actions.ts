"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { deleteUser, generateApiKey, revokeApiKey, updateUser } from "@/lib/users";

export async function updateUserAction(
  id: string,
  data: { role?: "ADMIN" | "MEMBER"; isActive?: boolean },
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    await updateUser(id, data, session.user.id);
  } catch (e) {
    if (
      e instanceof ForbiddenError ||
      e instanceof BadRequestError ||
      e instanceof NotFoundError
    )
      return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/users");
  return {};
}

export async function generateApiKeyAction(id: string): Promise<{ apiKey?: string; error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    const result = await generateApiKey(id);
    revalidatePath("/admin/users");
    return { apiKey: result.apiKey ?? undefined };
  } catch (e) {
    if (e instanceof NotFoundError) return { error: e.message };
    throw e;
  }
}

export async function revokeApiKeyAction(id: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    await revokeApiKey(id);
  } catch (e) {
    if (e instanceof NotFoundError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/users");
  return {};
}

export async function deleteUserAction(id: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  try {
    await deleteUser(id, session.user.id);
  } catch (e) {
    if (
      e instanceof ForbiddenError ||
      e instanceof NotFoundError ||
      e instanceof ConflictError
    )
      return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/users");
  return {};
}
