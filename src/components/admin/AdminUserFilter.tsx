"use client";

import { useRouter, useSearchParams } from "next/navigation";

type User = { id: string; name: string };

type Props = {
  basePath: string;
  users: User[];
  selectedUserId: string | undefined;
};

export function AdminUserFilter({ basePath, users, selectedUserId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("userId", e.target.value);
    } else {
      params.delete("userId");
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="user-filter" className="text-sm font-medium text-gray-700">
        ユーザー：
      </label>
      <select
        id="user-filter"
        value={selectedUserId ?? ""}
        onChange={handleChange}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
      >
        <option value="">全員</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  );
}
