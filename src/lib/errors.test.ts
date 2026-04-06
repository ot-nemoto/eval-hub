// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "./errors";

describe("NotFoundError", () => {
  it("デフォルトメッセージで生成できる", () => {
    const error = new NotFoundError();
    expect(error.message).toBe("Not found");
    expect(error.name).toBe("NotFoundError");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NotFoundError);
  });

  it("カスタムメッセージで生成できる", () => {
    const error = new NotFoundError("ユーザーが見つかりません");
    expect(error.message).toBe("ユーザーが見つかりません");
    expect(error.name).toBe("NotFoundError");
  });
});

describe("ForbiddenError", () => {
  it("デフォルトメッセージで生成できる", () => {
    const error = new ForbiddenError();
    expect(error.message).toBe("Forbidden");
    expect(error.name).toBe("ForbiddenError");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ForbiddenError);
  });

  it("カスタムメッセージで生成できる", () => {
    const error = new ForbiddenError("権限がありません");
    expect(error.message).toBe("権限がありません");
    expect(error.name).toBe("ForbiddenError");
  });
});

describe("ConflictError", () => {
  it("デフォルトメッセージで生成できる", () => {
    const error = new ConflictError();
    expect(error.message).toBe("Conflict");
    expect(error.name).toBe("ConflictError");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConflictError);
  });

  it("カスタムメッセージで生成できる", () => {
    const error = new ConflictError("紐づくデータが存在するため削除できません");
    expect(error.message).toBe("紐づくデータが存在するため削除できません");
    expect(error.name).toBe("ConflictError");
  });
});

describe("BadRequestError", () => {
  it("デフォルトメッセージで生成できる", () => {
    const error = new BadRequestError();
    expect(error.message).toBe("Bad request");
    expect(error.name).toBe("BadRequestError");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(BadRequestError);
  });

  it("カスタムメッセージで生成できる", () => {
    const error = new BadRequestError("入力値が不正です");
    expect(error.message).toBe("入力値が不正です");
    expect(error.name).toBe("BadRequestError");
  });
});
