export default function MembersLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-24 rounded bg-gray-200" />
        <div className="mt-1 h-4 w-20 rounded bg-gray-200" />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <div className="h-4 w-16 rounded bg-gray-200" />
              </th>
              <th className="px-4 py-3">
                <div className="h-4 w-12 rounded bg-gray-200" />
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-20 rounded bg-gray-200" />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="ml-auto h-4 w-16 rounded bg-gray-200" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
