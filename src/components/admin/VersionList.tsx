"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  deleteEvalItemVersionAction,
  restoreVersionAction,
} from "@/app/(dashboard)/admin/targets/actions";

type Version = {
  id: number;
  name: string;
  createdAt: string;
  detailCount: number;
  fiscalYearCount: number;
};

export function VersionList({ versions }: { versions: Version[] }) {
  const router = useRouter();
  const [restoring, startTransition] = useTransition();

  function handleDelete(versionId: number, versionName: string) {
    if (!confirm(`「${versionName}」を削除しますか？この操作は取り消せません。`)) return;

    startTransition(async () => {
      try {
        const result = await deleteEvalItemVersionAction(versionId);
        if (result.error) {
          alert(result.error);
        } else {
          router.refresh();
        }
      } catch {
        alert("通信エラーが発生しました");
      }
    });
  }

  function handleRestore(versionId: number, versionName: string) {
    if (
      !confirm(
        `「${versionName}」の内容で作業スペースを初期化します。\n現在の評価項目は上書きされます。よろしいですか？`,
      )
    )
      return;

    startTransition(async () => {
      try {
        const result = await restoreVersionAction(versionId);
        if (result.error) {
          alert(result.error);
        } else {
          router.refresh();
        }
      } catch {
        alert("通信エラーが発生しました");
      }
    });
  }

  if (versions.length === 0) return null;

  return (
    <div className="rounded-lg border bg-white">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">バージョン一覧</h3>
        <p className="text-xs text-gray-500">
          保存済みバージョンの確認・作業スペースへの復元を行います。
        </p>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-700">名称</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">項目数</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">使用年度数</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">作成日時</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {versions.map((v) => (
            <tr key={v.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium">
                <a
                  href={`/admin/targets/versions/${v.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {v.name}
                </a>
              </td>
              <td className="px-4 py-2 text-gray-500">{v.detailCount}</td>
              <td className="px-4 py-2 text-gray-500">{v.fiscalYearCount}</td>
              <td className="px-4 py-2 text-gray-500">{v.createdAt}</td>
              <td className="px-4 py-2 text-right">
                <div className="flex gap-2">
                  <a
                    href={`/admin/targets/compare?left=${v.id}&right=current`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    比較
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRestore(v.id, v.name)}
                    disabled={restoring}
                    className="rounded-md border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    作業スペースに復元
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(v.id, v.name)}
                    disabled={restoring || v.fiscalYearCount > 0}
                    title={
                      v.fiscalYearCount > 0
                        ? "年度に割り当て中のバージョンは削除できません"
                        : undefined
                    }
                    className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    削除
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
