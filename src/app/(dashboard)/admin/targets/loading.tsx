export default function TargetsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-28 rounded bg-gray-200" />
        <div className="mt-1 h-4 w-64 rounded bg-gray-200" />
      </div>

      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
              <div className="h-5 w-32 rounded bg-gray-200" />
              <div className="flex gap-2">
                <div className="h-7 w-12 rounded bg-gray-200" />
                <div className="h-7 w-12 rounded bg-gray-200" />
              </div>
            </div>
            <div className="divide-y">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center justify-between px-6 py-3">
                  <div className="h-4 w-28 rounded bg-gray-200" />
                  <div className="flex gap-2">
                    <div className="h-7 w-12 rounded bg-gray-200" />
                    <div className="h-7 w-12 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
