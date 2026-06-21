"use client";

import { useState } from "react";
import {
  generateMyApiKeyAction,
  revokeMyApiKeyAction,
  updateNameAction,
} from "@/app/(dashboard)/actions";

type Props = {
  initialName: string;
  email: string;
  hasInitialApiKey: boolean;
};

export function SettingsForm({ initialName, email, hasInitialApiKey }: Props) {
  const [name, setName] = useState(initialName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [namePending, setNamePending] = useState(false);

  const [hasApiKey, setHasApiKey] = useState(hasInitialApiKey);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyPending, setApiKeyPending] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNamePending(true);
    setNameError(null);
    setNameSuccess(false);
    try {
      const result = await updateNameAction(name);
      if (result.error) setNameError(result.error);
      else setNameSuccess(true);
    } catch {
      setNameError("通信エラーが発生しました");
    } finally {
      setNamePending(false);
    }
  }

  async function handleGenerate() {
    setApiKeyPending(true);
    setApiKeyError(null);
    try {
      const result = await generateMyApiKeyAction();
      if (result.error) {
        setApiKeyError(result.error);
      } else if (result.apiKey) {
        setHasApiKey(true);
        setApiKey(result.apiKey);
        setApiKeyVisible(true);
      }
    } catch {
      setApiKeyError("通信エラーが発生しました");
    } finally {
      setApiKeyPending(false);
    }
  }

  async function handleRevoke() {
    if (!confirm("API キーを失効しますか？失効すると元に戻せません。")) return;
    setApiKeyPending(true);
    setApiKeyError(null);
    try {
      const result = await revokeMyApiKeyAction();
      if (result.error) {
        setApiKeyError(result.error);
      } else {
        setHasApiKey(false);
        setApiKey(null);
        setApiKeyVisible(false);
      }
    } catch {
      setApiKeyError("通信エラーが発生しました");
    } finally {
      setApiKeyPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* プロフィール */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-zinc-900">プロフィール</h3>
        <form onSubmit={handleNameSubmit} className="space-y-4">
          <div>
            <p className="text-xs font-medium text-zinc-500">メールアドレス</p>
            <p className="mt-1 text-sm text-zinc-700">{email}</p>
          </div>
          <div>
            <label htmlFor="settings-name" className="text-xs font-medium text-zinc-500">
              名前
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              disabled={namePending}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
            />
          </div>
          {nameError && <p className="text-xs text-red-600">{nameError}</p>}
          {nameSuccess && <p className="text-xs text-green-600">名前を更新しました</p>}
          <button
            type="submit"
            disabled={namePending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {namePending ? "保存中..." : "保存する"}
          </button>
        </form>
      </div>

      {/* API キー */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-sm font-bold text-zinc-900">API キー</h3>
        <p className="mb-4 text-xs text-zinc-500">
          外部ツールやスクリプトから評価項目を登録するためのキーです。
        </p>
        <div className="space-y-3">
          {!hasApiKey ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={apiKeyPending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {apiKeyPending ? "生成中..." : "生成する"}
            </button>
          ) : apiKey ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  type={apiKeyVisible ? "text" : "password"}
                  readOnly
                  value={apiKey}
                  className="block w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-700"
                />
                <button
                  type="button"
                  onClick={() => setApiKeyVisible((v) => !v)}
                  className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                >
                  {apiKeyVisible ? "隠す" : "表示"}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={apiKeyPending}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {apiKeyPending ? "処理中..." : "再生成"}
                </button>
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={apiKeyPending}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {apiKeyPending ? "処理中..." : "失効"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  readOnly
                  value="placeholder"
                  className="block w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={apiKeyPending}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {apiKeyPending ? "処理中..." : "再生成"}
                </button>
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={apiKeyPending}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {apiKeyPending ? "処理中..." : "失効"}
                </button>
              </div>
            </>
          )}
          {apiKeyError && <p className="text-xs text-red-600">{apiKeyError}</p>}
        </div>
      </div>
    </div>
  );
}
