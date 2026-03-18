import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Session = {
  user: {
    id: string;
    name: string;
    role: UserRole;
  };
};

export async function getSession(): Promise<Session | null> {
  // 非本番環境: MOCK_USER_ID が設定されている場合は DB から直接セッションを返す
  if (process.env.NODE_ENV !== "production" && process.env.MOCK_USER_ID) {
    const user = await prisma.user.findUnique({
      where: { id: process.env.MOCK_USER_ID },
      select: { id: true, name: true, role: true },
    });
    return user ? { user } : null;
  }

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
      // clerk_id: null の場合のみ更新（並行リクエストによる上書き防止）
      const { count } = await prisma.user.updateMany({
        where: { email, clerk_id: null },
        data: { clerk_id: userId },
      });
      if (count === 0) {
        // 別リクエストが先に紐付けを完了した場合は再取得して返す
        user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, role: true },
        });
        if (!user) return null;
      } else {
        user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, role: true },
        });
        if (!user) return null;
      }
    }
  }

  return { user };
}
