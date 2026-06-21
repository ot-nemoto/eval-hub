"use client";

import type { Score } from "@prisma/client";
import { useState } from "react";

const SCORE_LABEL: Record<Score, string> = {
  none: "なし",
  ka: "可",
  ryo: "良",
  yu: "優",
};

const SCORE_CLASS: Record<Score, string> = {
  none: "text-gray-400",
  ka: "text-gray-700",
  ryo: "text-blue-600 font-medium",
  yu: "text-green-600 font-medium",
};

type User = { id: string; name: string };

type Row = {
  uid: string;
  name: string;
  scores: { selfScore: Score | null; managerScore: Score | null }[];
};

type Props = {
  users: User[];
  rows: Row[];
};

type Mode = "self" | "manager" | "both";

function ScoreLabel({ score }: { score: Score | null }) {
  if (score === null) {
    return <span className="text-gray-300">-</span>;
  }
  return <span className={SCORE_CLASS[score]}>{SCORE_LABEL[score]}</span>;
}

export function EvaluationMatrix({ users, rows }: Props) {
  const [mode, setMode] = useState<Mode>("self");

  if (users.length === 0 || rows.length === 0) {
    return (
      <div className="rounded-lg border bg-white px-4 py-8 text-center text-gray-500">
        評価データがありません。
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-1 rounded-lg border bg-gray-100 p-1 w-fit">
        <button
          type="button"
          aria-pressed={mode === "self"}
          onClick={() => setMode("self")}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            mode === "self"
              ? "bg-white font-medium text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          自己採点
        </button>
        <button
          type="button"
          aria-pressed={mode === "manager"}
          onClick={() => setMode("manager")}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            mode === "manager"
              ? "bg-white font-medium text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          上長採点
        </button>
        <button
          type="button"
          aria-pressed={mode === "both"}
          onClick={() => setMode("both")}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            mode === "both"
              ? "bg-white font-medium text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          両方
        </button>
      </div>

      <div className="relative z-0 overflow-auto rounded-lg border bg-white max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-20 bg-gray-50">
            <tr className="border-b">
              <th className="sticky left-0 z-30 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap border-r">
                評価項目
              </th>
              {users.map((user) => (
                <th
                  key={user.id}
                  className="px-3 py-2 text-center font-medium text-gray-700 whitespace-nowrap"
                >
                  {user.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.uid} className="hover:bg-gray-50">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-white px-3 py-2 whitespace-nowrap border-r text-left font-normal"
                >
                  <span className="font-mono text-xs text-gray-400 mr-2">{row.uid}</span>
                  <span className="text-gray-700">{row.name}</span>
                </th>
                {row.scores.map((score, i) => (
                  <td key={users[i].id} className="px-3 py-2 text-center whitespace-nowrap">
                    {mode === "both" ? (
                      <>
                        <ScoreLabel score={score.selfScore} />
                        <span className="text-gray-300 mx-0.5">/</span>
                        <ScoreLabel score={score.managerScore} />
                      </>
                    ) : (
                      <ScoreLabel score={mode === "self" ? score.selfScore : score.managerScore} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        {rows.length} 項目 × {users.length} 名
      </p>
    </div>
  );
}
