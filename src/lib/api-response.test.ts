// @vitest-environment node
import { Prisma } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  jsonError,
  jsonErrorFromException,
  serializeEvaluationItem,
  statusForError,
  unauthorized,
  WRAPPED,
  withApiErrorHandling,
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

  it("Prisma P2025（対象なし）は 404", async () => {
    const res = jsonErrorFromException(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "5",
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body).toEqual({ error: "対象のデータが見つかりません" });
  });

  it("Prisma P2003（FK 参照先なし）は 404", async () => {
    const res = jsonErrorFromException(
      new Prisma.PrismaClientKnownRequestError("FK failed", {
        code: "P2003",
        clientVersion: "5",
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body).toEqual({ error: "参照先のデータが見つかりません" });
  });
});

describe("withApiErrorHandling", () => {
  it("正常系: 監査ログを 1 件出力する（ステータスはハンドラの戻り値）", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = withApiErrorHandling(
      async (_req: Request) => new Response(null, { status: 204 }),
    );

    await handler(new Request("https://example.com/api/items/x1", { method: "DELETE" }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({
      type: "audit",
      method: "DELETE",
      path: "/api/items/x1",
      status: 204,
    });
  });

  // 認証失敗も記録する。userId が取れないため、総当たりの検知は IP に依存する。
  it("正常系: 401 でも記録し、userId は null になる", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = withApiErrorHandling(async (_req: Request) => unauthorized());

    await handler(
      new Request("https://example.com/api/items", {
        headers: { "x-forwarded-for": "203.0.113.9" },
      }),
    );

    expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({
      status: 401,
      userId: null,
      ip: "203.0.113.9",
    });
  });

  it("異常系: 500 に化けた場合も記録する", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = withApiErrorHandling(async (_req: Request) => {
      throw new Error("DB connection lost");
    });

    await handler(new Request("https://example.com/api/items", { method: "POST" }));

    expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({ status: 500 });
  });

  // 制御フロー例外は再 throw するため、ステータスが確定しない。記録しない。
  it("異常系: redirect() の再 throw 時は記録しない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = withApiErrorHandling(async (_req: Request) => {
      redirect("/login");
    });

    await expect(handler(new Request("https://example.com/api/me"))).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  it("異常系: Request が渡っていなければ記録しない", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = withApiErrorHandling(async () => new Response("ok"));

    await handler();

    expect(spy).not.toHaveBeenCalled();
  });

  // eval-hub のラッパーは jsonErrorFromException で型付きエラーを 404 / 403 / 409 にも
  // 変換する。500 固定で記録すると実態とズレるため、実際のステータスを記録する。
  it("異常系: 型付きエラーで 500 以外になった場合は実際のステータスを記録する", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = withApiErrorHandling(async (_req: Request) => {
      throw new NotFoundError();
    });

    const res = await handler(new Request("https://example.com/api/items/missing"));

    expect(res.status).toBe(404);
    expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({ status: 404 });
  });

  const req = new Request("http://localhost/api/targets/1?x=1", { method: "PATCH" });
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => consoleError.mockRestore());

  /** 例外を投げるハンドラを包み、レスポンスを jsonErrorFromException の結果と比較できる形で返す */
  async function callThrowing(error: unknown) {
    const res = await withApiErrorHandling(async (_req: Request) => {
      throw error;
    })(req);
    return { status: res.status, body: await res.json() };
  }

  async function expected(error: unknown) {
    const res = jsonErrorFromException(error);
    return { status: res.status, body: await res.json() };
  }

  describe("正常系", () => {
    it("ハンドラのレスポンスをそのまま返す", async () => {
      const response = new Response(null, { status: 204 });
      const handler = vi.fn(
        async (_req: Request, _ctx: { params: Promise<{ id: string }> }) => response,
      );
      const ctx = { params: Promise.resolve({ id: "1" }) };

      const res = await withApiErrorHandling(handler)(req, ctx);

      expect(res).toBe(response);
      expect(handler).toHaveBeenCalledWith(req, ctx);
      expect(consoleError).not.toHaveBeenCalled();
    });

    it("戻り値に包まれていることを示す印（WRAPPED）が付き、元のハンドラには付かない", () => {
      const handler = async (_req: Request) => new Response(null);

      const wrapped = withApiErrorHandling(handler) as unknown as Record<symbol, unknown>;

      expect(wrapped[WRAPPED]).toBe(true);
      expect((handler as unknown as Record<symbol, unknown>)[WRAPPED]).toBeUndefined();
    });

    it("ハンドラが返したエラーレスポンス（400 等）もそのまま返し、ログは出さない", async () => {
      const response = jsonError("name を入力してください", 400);

      const res = await withApiErrorHandling(async (_req: Request) => response)(req);

      expect(res).toBe(response);
      expect(consoleError).not.toHaveBeenCalled();
    });
  });

  describe("異常系", () => {
    it.each([
      ["NotFoundError", new NotFoundError("目標が見つかりません"), 404],
      ["ForbiddenError", new ForbiddenError("自分自身は削除できません"), 403],
      ["ConflictError", new ConflictError("no が重複しています"), 409],
      ["BadRequestError", new BadRequestError("name を入力してください"), 400],
      [
        "Prisma P2025",
        new Prisma.PrismaClientKnownRequestError("Record not found", {
          code: "P2025",
          clientVersion: "7",
        }),
        404,
      ],
      [
        "Prisma P2003",
        new Prisma.PrismaClientKnownRequestError("FK failed", {
          code: "P2003",
          clientVersion: "7",
        }),
        404,
      ],
    ])(
      "%s は jsonErrorFromException と同じレスポンスを返し、ログは出さない",
      async (_, error, status) => {
        const actual = await callThrowing(error);

        expect(actual).toEqual(await expected(error));
        expect(actual.status).toBe(status);
        expect(consoleError).not.toHaveBeenCalled();
      },
    );

    it("想定外の例外は 500 の汎用文言を返し、メソッド・パスと例外をログに残す", async () => {
      const error = new Error("Prisma: connection refused at host db:5432");

      const actual = await callThrowing(error);

      expect(actual).toEqual({ status: 500, body: { error: "サーバーエラーが発生しました" } });
      expect(consoleError).toHaveBeenCalledWith("[api] 500 PATCH /api/targets/1", error);
    });

    it.each([
      ["redirect()", () => redirect("/login")],
      ["notFound()", () => notFound()],
    ])("Next.js の制御用の例外（%s）は 500 に変えず投げ直す", async (_, interrupt) => {
      let thrown: unknown;
      try {
        interrupt();
      } catch (e) {
        thrown = e;
      }

      await expect(
        withApiErrorHandling(async (_req: Request) => {
          throw thrown;
        })(req),
      ).rejects.toBe(thrown);
      expect(consoleError).not.toHaveBeenCalled();
    });

    it("第 1 引数が Request でなくても 500 を返す", async () => {
      const error = new Error("boom");

      const res = await withApiErrorHandling(async () => {
        throw error;
      })();

      expect(res.status).toBe(500);
      expect(consoleError).toHaveBeenCalledWith("[api] 500", error);
    });
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
