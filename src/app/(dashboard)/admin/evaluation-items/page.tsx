import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

export default async function EvaluationItemsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  redirect("/admin/targets");
}
