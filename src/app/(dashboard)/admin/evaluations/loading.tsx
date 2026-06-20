export default function AdminEvaluationsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-24 rounded bg-gray-200" />
        <div className="mt-1 h-4 w-56 rounded bg-gray-200" />
      </div>

      <div className="mb-4 flex gap-2">
        <div className="h-9 w-40 rounded bg-gray-200" />
        <div className="h-9 w-48 rounded bg-gray-200" />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="h-64 w-full rounded bg-gray-100" />
      </div>
    </div>
  );
}
