import { auth } from "@clerk/nextjs/server";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Session = {
  user: {
    id: string;
    name: string;
    role: UserRole;
  };
};

export async function getSession(): Promise<Session | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerk_id: userId },
    select: { id: true, name: true, role: true },
  });
  if (!user) return null;

  return { user };
}
