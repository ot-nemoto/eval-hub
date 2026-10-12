import { type NextRequest, NextResponse } from "next/server";
import { jsonError, serializeUser, unauthorized, withApiErrorHandling } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getUsers } from "@/lib/users";

export const GET = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  const users = await getUsers();
  return NextResponse.json({ users: users.map(serializeUser) });
});
