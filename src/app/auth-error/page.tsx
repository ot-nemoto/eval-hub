import { SignOutButton } from "@clerk/nextjs";

type Props = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function AuthErrorPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const isInactive = reason === "inactive";

  const message = isInactive
    ? "アカウントが無効化されています。管理者にお問い合わせください。"
    : "このアカウントはすでに別のユーザーに紐付けられています。一度サインアウトして、正しいアカウントでログインしてください。";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm text-center">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">ログインできません</h1>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <SignOutButton redirectUrl="/login">
          <button
            type="button"
            className="cursor-pointer rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            サインアウト
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
