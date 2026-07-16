// @vitest-environment node
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluations", () => ({ upsertEvaluation: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { upsertEvaluation } from "@/lib/evaluations";
import { POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makePost(body: unknown) {
  return new Request("http://localhost/api/evaluations/self-score", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

const validBody = {
  fiscalYear: 2025,
  evaluateeId: "e1",
  evalItemVersionDetailId: 1,
  selfScore: "ryo",
  selfReason: "理由",
};

describe("POST /api/evaluations/self-score", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upsert して 200 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(upsertEvaluation).mockResolvedValue({
      evalItemVersionDetailId: 1,
      selfScore: "ryo",
      selfReason: "理由",
    });

    const res = await POST(makePost(validBody));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.selfScore).toBe("ryo");
    expect(upsertEvaluation).toHaveBeenCalledWith(validBody);
  });

  it("不正なスコア・必須欠落・年度範囲外は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makePost({ ...validBody, selfScore: "bad" }))).status).toBe(400);
    expect((await POST(makePost({ evaluateeId: "e1", evalItemVersionDetailId: 1 }))).status).toBe(
      400,
    );
    expect((await POST(makePost({ ...validBody, fiscalYear: 1800 }))).status).toBe(400);
    expect(upsertEvaluation).not.toHaveBeenCalled();
  });

  it("参照先未存在（FK P2003）は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(upsertEvaluation).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("FK", { code: "P2003", clientVersion: "5" }),
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
