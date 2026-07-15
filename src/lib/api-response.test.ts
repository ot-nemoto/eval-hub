// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  jsonError,
  jsonErrorFromException,
  serializeEvaluationItem,
  statusForError,
  unauthorized,
} from "./api-response";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "./errors";

describe("jsonError", () => {
  it("{ error } ボディ付きで指定ステータスを返す", async () => {
    const res = jsonError("入力値が不正です", 400);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "入力値が不正です" });
  });
});

describe("unauthorized", () => {
  it("401 で { error } を返す", async () => {
    const res = unauthorized();
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "API キーが無効です" });
  });
});

describe("statusForError", () => {
  it("NotFoundError は 404", () => {
    expect(statusForError(new NotFoundError())).toBe(404);
  });
  it("ForbiddenError は 403", () => {
    expect(statusForError(new ForbiddenError())).toBe(403);
  });
  it("ConflictError は 409", () => {
    expect(statusForError(new ConflictError())).toBe(409);
  });
  it("BadRequestError は 400", () => {
    expect(statusForError(new BadRequestError())).toBe(400);
  });
  it("未知のエラーは 500", () => {
    expect(statusForError(new Error("boom"))).toBe(500);
    expect(statusForError("string")).toBe(500);
  });
});

describe("jsonErrorFromException", () => {
  it("型付きエラーは意図した日本語メッセージと対応ステータスを返す", async () => {
    const res = jsonErrorFromException(new ConflictError("no が重複しています"));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body).toEqual({ error: "no が重複しています" });
  });

  it("想定外エラー（500）は内部メッセージを隠して汎用文言に固定する", async () => {
    const res = jsonErrorFromException(new Error("Prisma: connection refused at host db:5432"));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body).toEqual({ error: "サーバーエラーが発生しました" });
  });
});

describe("serializeEvaluationItem", () => {
  it("camelCase / target・category をネストして整形する", () => {
    const result = serializeEvaluationItem({
      id: 1,
      no: 2,
      name: "評価項目A",
      description: "説明",
      evalCriteria: "基準",
      target: { id: 10, no: 1, name: "社員" },
      category: { id: 20, no: 3, name: "エンゲージメント" },
    });
    expect(result).toEqual({
      id: 1,
      no: 2,
      name: "評価項目A",
      description: "説明",
      evalCriteria: "基準",
      target: { id: 10, no: 1, name: "社員" },
      category: { id: 20, no: 3, name: "エンゲージメント" },
    });
  });

  it("description・evalCriteria が null でもそのまま返す", () => {
    const result = serializeEvaluationItem({
      id: 1,
      no: 1,
      name: "A",
      description: null,
      evalCriteria: null,
      target: { id: 1, no: 1, name: "T" },
      category: { id: 1, no: 1, name: "C" },
    });
    expect(result.description).toBeNull();
    expect(result.evalCriteria).toBeNull();
  });
});
