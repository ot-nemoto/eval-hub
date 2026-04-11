export default function EvaluationSettingsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="mt-2 h-7 w-36 rounded bg-gray-200" />
        <div className="mt-1 h-4 w-48 rounded bg-gray-200" />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              {[...Array(3)].map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 w-16 rounded bg-gray-200" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...Array(3)].map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3">
                  <div className="h-4 w-20 rounded bg-gray-200" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-6 w-10 rounded-full bg-gray-200" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-8 rounded bg-gray-200" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
