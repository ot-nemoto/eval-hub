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
  // 非本番環境: MOCK_USER_ID / MOCK_USER_EMAIL が設定されている場合は DB から直接セッションを返す
  if (process.env.NODE_ENV !== "production") {
    if (process.env.MOCK_USER_ID) {
      const user = await prisma.user.findUnique({
        where: { id: process.env.MOCK_USER_ID },
        select: { id: true, name: true, role: true, isActive: true },
      });
      if (!user || !user.isActive) return null;
      return { user: { id: user.id, name: user.name, role: user.role } };
    }
    if (process.env.MOCK_USER_EMAIL) {
      const user = await prisma.user.findUnique({
        where: { email: process.env.MOCK_USER_EMAIL },
        select: { id: true, name: true, role: true, isActive: true },
      });
      if (!user || !user.isActive) return null;
      return { user: { id: user.id, name: user.name, role: user.role } };
    }
  }

  const { userId } = await auth();
  if (!userId) return null;

  // まず clerkId で検索
  const userByClerkId = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (userByClerkId) {
    if (!userByClerkId.isActive) return null;
    return { user: { id: userByClerkId.id, name: userByClerkId.name, role: userByClerkId.role } };
  }

  // 見つからない場合、メールアドレスで突合して初回紐付け or 新規作成
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true, clerkId: true, isActive: true },
  });

  if (!existingUser) {
    // DB に存在しない新規サインアップユーザーを自動作成
    // 並行リクエストによるレースコンディション対策: P2002 をキャッチして既存レコードを返す
    const name = clerkUser?.fullName ?? clerkUser?.firstName ?? email;
    try {
      const created = await prisma.user.create({
        data: { clerkId: userId, email, name, role: "member" },
        select: { id: true, name: true, role: true },
      });
      return { user: created };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, role: true, isActive: true },
        });
        if (!user || !user.isActive) return null;
        return { user: { id: user.id, name: user.name, role: user.role } };
      }
      throw e;
    }
  }

  if (existingUser.clerkId) {
    return null; // 既に別の Clerk ID に紐付き済み
  }

  if (!existingUser.isActive) return null;

  // clerkId: null の場合のみ更新（並行リクエストによる上書き防止）
  const { count } = await prisma.user.updateMany({
    where: { email, clerkId: null },
    data: { clerkId: userId },
  });
  if (count === 0) {
    // 別リクエストが先に紐付けを完了した場合は再取得して返す
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) return null;
    return { user: { id: user.id, name: user.name, role: user.role } };
  }

  return { user: { id: existingUser.id, name: existingUser.name, role: existingUser.role } };
}
