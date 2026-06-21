// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }) }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/fiscal-years", () => ({}));
vi.mock("@/lib/eval-item-versions", () => ({
  assignVersionToFiscalYear: vi.fn(),
  unassignVersionFromFiscalYear: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import {
  assignVersionToFiscalYear,
  unassignVersionFromFiscalYear,
} from "@/lib/eval-item-versions";
import { assignVersionAction, unassignVersionAction } from "./actions";

const adminSession = { user: { id: "u1", role: "ADMIN" } };
const memberSession = { user: { id: "u2", role: "MEMBER" } };

describe("assignVersionAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未ログインでリダイレクト", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(assignVersionAction(2026, 1)).rejects.toThrow("REDIRECT:/login");
  });

  it("MEMBER でリダイレクト", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    await expect(assignVersionAction(2026, 1)).rejects.toThrow("REDIRECT:/evaluations");
  });

  it("不正な year でエラー", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    const result = await assignVersionAction(0, 1);
    expect(result).toEqual({ error: "year は 1900〜9999 の整数で指定してください" });
  });

  it("不正な versionId でエラー", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    const result = await assignVersionAction(2026, -1);
    expect(result).toEqual({ error: "versionId は正の整数で指定してください" });
  });

  it("NotFoundError を catch してエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(assignVersionToFiscalYear).mockRejectedValue(new NotFoundError("年度が見つかりません"));
    const result = await assignVersionAction(2026, 1);
    expect(result).toEqual({ error: "年度が見つかりません" });
  });

  it("ConflictError を catch してエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(assignVersionToFiscalYear).mockRejectedValue(
      new ConflictError("この年度はロックされているため編集できません"),
    );
    const result = await assignVersionAction(2026, 1);
    expect(result).toEqual({ error: "この年度はロックされているため編集できません" });
  });

  it("正常系で空オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(assignVersionToFiscalYear).mockResolvedValue({ year: 2026, evalItemVersionId: 1 } as never);
    const result = await assignVersionAction(2026, 1);
    expect(result).toEqual({});
    expect(assignVersionToFiscalYear).toHaveBeenCalledWith(2026, 1);
  });
});

describe("unassignVersionAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未ログインでリダイレクト", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(unassignVersionAction(2026)).rejects.toThrow("REDIRECT:/login");
  });

  it("MEMBER でリダイレクト", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    await expect(unassignVersionAction(2026)).rejects.toThrow("REDIRECT:/evaluations");
  });

  it("不正な year でエラー", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    const result = await unassignVersionAction(0);
    expect(result).toEqual({ error: "year は 1900〜9999 の整数で指定してください" });
  });

  it("ConflictError を catch してエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(unassignVersionFromFiscalYear).mockRejectedValue(
      new ConflictError("この年度はロックされているため編集できません"),
    );
    const result = await unassignVersionAction(2026);
    expect(result).toEqual({ error: "この年度はロックされているため編集できません" });
  });

  it("正常系で空オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(unassignVersionFromFiscalYear).mockResolvedValue({ year: 2026, evalItemVersionId: null } as never);
    const result = await unassignVersionAction(2026);
    expect(result).toEqual({});
    expect(unassignVersionFromFiscalYear).toHaveBeenCalledWith(2026);
  });
});
