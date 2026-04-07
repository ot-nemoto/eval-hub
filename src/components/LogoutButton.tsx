"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOut({ redirectUrl: "/login" });
    } catch {
      // mock モード等 Clerk セッションが存在しない場合のフォールバック
      router.push("/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="cursor-pointer rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
    >
      ログアウト
    </button>
  );
}
