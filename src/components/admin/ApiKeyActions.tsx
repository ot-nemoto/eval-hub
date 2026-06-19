"use client";

import { useState } from "react";
import { generateApiKeyAction, revokeApiKeyAction } from "@/app/(dashboard)/admin/users/actions";

type Props = {
  userId: string;
  hasApiKey: boolean;
};

export function ApiKeyActions({ userId, hasApiKey }: Props) {
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  async function handleGenerate() {
    if (hasApiKey && !confirm("既存の API キーを無効化して新しいキーを発行しますか？")) return;

    setLoading(true);
    try {
      const result = await generateApiKeyAction(userId);
      if (result.error) {
        alert(result.error);
      } else if (result.apiKey) {
        setGeneratedKey(result.apiKey);
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (!confirm("この API キーを無効化しますか？")) return;

    setLoading(true);
    try {
      const result = await revokeApiKeyAction(userId);
      if (result.error) alert(result.error);
      else setGeneratedKey(null);
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (generatedKey) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-xs text-zinc-500">発行しました（この画面のみ表示）</p>
        <div className="flex items-center gap-1">
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 max-w-[180px] truncate">
            {generatedKey}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(generatedKey);
            }}
            className="text-xs text-zinc-500 hover:text-zinc-700"
          >
            コピー
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        {hasApiKey ? "再発行" : "発行"}
      </button>
      {hasApiKey && (
        <button
          type="button"
          onClick={handleRevoke}
          disabled={loading}
          className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          無効化
        </button>
      )}
    </div>
  );
}
