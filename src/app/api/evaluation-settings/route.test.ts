// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluation-settings", () => ({
  getEvaluationSettings: vi.fn(),
  upsertEvaluationSetting: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { NotFoundError } from "@/lib/errors";
import { getEvaluationSettings, upsertEvaluationSetting } from "@/lib/evaluation-settings";
import { GET, POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

const setting = { fiscalYear: 2025, selfEvaluationEnabled: true };

function makeGet(query = "") {
  return new Request(`http://localhost/api/evaluation-settings${query}`, {
    method: "GET",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}
function makePost(body: unknown) {
  return new Request("http://localhost/api/evaluation-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

describe("GET /api/evaluation-settings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("userId 指定で一覧を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getEvaluationSettings).mockResolvedValue([setting]);

    const res = await GET(makeGet("?userId=u9"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ evaluationSettings: [setting] });
    expect(getEvaluationSettings).toHaveBeenCalledWith("u9");
  });

  it("userId 未指定は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await GET(makeGet())).status).toBe(400);
    expect(getEvaluationSettings).not.toHaveBeenCalled();
  });

  it("ユーザー未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getEvaluationSettings).mockRejectedValue(
      new NotFoundError("ユーザーが見つかりません"),
    );
    expect((await GET(makeGet("?userId=x"))).status).toBe(404);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeGet("?userId=u9"))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeGet("?userId=u9"))).status).toBe(403);
  });
});

describe("POST /api/evaluation-settings", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = { userId: "u9", fiscalYear: 2025, selfEvaluationEnabled: true };

  it("upsert して 200 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(upsertEvaluationSetting).mockResolvedValue(setting);

    const res = await POST(makePost(validBody));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual(setting);
    expect(upsertEvaluationSetting).toHaveBeenCalledWith("u9", 2025, {
      selfEvaluationEnabled: true,
    });
  });

  it("必須欠落・非真偽値・年度範囲外は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makePost({ userId: "u9", fiscalYear: 2025 }))).status).toBe(400);
    expect((await POST(makePost({ ...validBody, selfEvaluationEnabled: "yes" }))).status).toBe(400);
    expect((await POST(makePost({ ...validBody, fiscalYear: 1800 }))).status).toBe(400);
    expect(upsertEvaluationSetting).not.toHaveBeenCalled();
  });

  it("ユーザー未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(upsertEvaluationSetting).mockRejectedValue(
      new NotFoundError("ユーザーが見つかりません"),
    );
    expect((await POST(makePost(validBody))).status).toBe(404);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await POST(makePost(validBody))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await POST(makePost(validBody))).status).toBe(403);
  });
});
