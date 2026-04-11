"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <p className="text-red-600">エラーが発生しました：{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-100"
      >
        再試行
      </button>
    </div>
  );
}

