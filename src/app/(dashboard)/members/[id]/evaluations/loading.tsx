export default function MemberEvaluationsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="mt-2 h-7 w-48 rounded bg-gray-200" />
        <div className="mt-1 h-4 w-20 rounded bg-gray-200" />
      </div>

      {/* タブ */}
      <div className="mb-4 flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-9 w-24 rounded bg-gray-200" />
        ))}
      </div>

      {/* 評価項目カード */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-4">
            <div className="mb-2 h-5 w-1/3 rounded bg-gray-200" />
            <div className="mb-3 h-4 w-2/3 rounded bg-gray-200" />
            <div className="flex gap-2">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-8 w-16 rounded bg-gray-200" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
