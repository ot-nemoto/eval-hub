"use client";

import { useEffect } from "react";
import { SettingsForm } from "@/components/SettingsForm";

type Props = {
  initialName: string;
  email: string;
  hasInitialApiKey: boolean;
  onClose: () => void;
};

export function SettingsModal({ initialName, email, hasInitialApiKey, onClose }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 mx-4 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-zinc-50 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 rounded-t-xl">
          <h2 id="settings-dialog-title" className="text-base font-bold text-zinc-900">
            個人設定
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <SettingsForm
            initialName={initialName}
            email={email}
            hasInitialApiKey={hasInitialApiKey}
          />
        </div>
      </div>
    </div>
  );
}
