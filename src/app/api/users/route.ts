import { type NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorFromException, serializeUser, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getUsers } from "@/lib/users";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return jsonError("権限がありません", 403);

  try {
    const users = await getUsers();
    return NextResponse.json({ users: users.map(serializeUser) });
  } catch (e) {
    return jsonErrorFromException(e);
  }
}
