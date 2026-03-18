import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
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

  // まず clerk_id で検索
  let user = await prisma.user.findUnique({
    where: { clerk_id: userId },
    select: { id: true, name: true, role: true },
  });

  // 見つからない場合、メールアドレスで突合して初回紐付け or 新規作成
  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress;
    if (!email) return null;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true, clerk_id: true },
    });

    if (!existingUser) {
      // DB に存在しない新規サインアップユーザーを自動作成
      // 並行リクエストによるレースコンディション対策: P2002 をキャッチして既存レコードを返す
      const name = clerkUser?.fullName ?? clerkUser?.firstName ?? email;
      try {
        user = await prisma.user.create({
          data: { clerk_id: userId, email, name, role: "member" },
          select: { id: true, name: true, role: true },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, role: true },
          });
          if (!user) return null;
        } else {
          throw e;
        }
      }
    } else if (existingUser.clerk_id) {
      return null; // 既に別の Clerk ID に紐付き済み
    } else {
      user = await prisma.user.update({
        where: { email },
        data: { clerk_id: userId },
        select: { id: true, name: true, role: true },
      });
    }
  }

  return { user };
}
