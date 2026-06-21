// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/categories", () => ({}));
vi.mock("@/lib/targets", () => ({}));
vi.mock("@/lib/evaluation-items", () => ({}));
vi.mock("@/lib/eval-item-versions", () => ({
  createEvalItemVersion: vi.fn(),
  restoreEvalItemVersion: vi.fn(),
  deleteEvalItemVersion: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import {
  createEvalItemVersion,
  deleteEvalItemVersion,
  restoreEvalItemVersion,
} from "@/lib/eval-item-versions";
import {
  createEvalItemVersionAction,
  deleteEvalItemVersionAction,
  restoreVersionAction,
} from "./actions";

const adminSession = { user: { id: "u1", role: "ADMIN" } };
const memberSession = { user: { id: "u2", role: "MEMBER" } };

describe("createEvalItemVersionAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未ログインでリダイレクト", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(createEvalItemVersionAction("v1")).rejects.toThrow("REDIRECT:/login");
  });

  it("MEMBER でリダイレクト", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    await expect(createEvalItemVersionAction("v1")).rejects.toThrow("REDIRECT:/evaluations");
  });

  it("空文字でエラー", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    const result = await createEvalItemVersionAction("  ");
    expect(result).toEqual({ error: "バージョン名は必須です" });
  });

  it("BadRequestError を catch してエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(createEvalItemVersion).mockRejectedValue(
      new BadRequestError("評価項目が存在しません"),
    );
    const result = await createEvalItemVersionAction("v1");
    expect(result).toEqual({ error: "評価項目が存在しません" });
  });

  it("正常系で空オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(createEvalItemVersion).mockResolvedValue({
      id: 1,
      name: "v1",
      createdAt: new Date(),
    } as never);
    const result = await createEvalItemVersionAction("v1");
    expect(result).toEqual({});
    expect(createEvalItemVersion).toHaveBeenCalledWith("v1");
  });
});

describe("restoreVersionAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未ログインでリダイレクト", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(restoreVersionAction(1)).rejects.toThrow("REDIRECT:/login");
  });

  it("不正な versionId でエラー", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    const result = await restoreVersionAction(-1);
    expect(result).toEqual({ error: "versionId は正の整数で指定してください" });
  });

  it("NotFoundError を catch してエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(restoreEvalItemVersion).mockRejectedValue(
      new NotFoundError("バージョンが見つかりません"),
    );
    const result = await restoreVersionAction(999);
    expect(result).toEqual({ error: "バージョンが見つかりません" });
  });

  it("正常系で空オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(restoreEvalItemVersion).mockResolvedValue(undefined as never);
    const result = await restoreVersionAction(1);
    expect(result).toEqual({});
  });
});

describe("deleteEvalItemVersionAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未ログインでリダイレクト", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(deleteEvalItemVersionAction(1)).rejects.toThrow("REDIRECT:/login");
  });

  it("不正な versionId でエラー", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    const result = await deleteEvalItemVersionAction(0);
    expect(result).toEqual({ error: "versionId は正の整数で指定してください" });
  });

  it("ConflictError を catch してエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(deleteEvalItemVersion).mockRejectedValue(
      new ConflictError("年度に割り当て中のバージョンは削除できません"),
    );
    const result = await deleteEvalItemVersionAction(1);
    expect(result).toEqual({ error: "年度に割り当て中のバージョンは削除できません" });
  });

  it("正常系で空オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(deleteEvalItemVersion).mockResolvedValue(undefined as never);
    const result = await deleteEvalItemVersionAction(1);
    expect(result).toEqual({});
  });
});
