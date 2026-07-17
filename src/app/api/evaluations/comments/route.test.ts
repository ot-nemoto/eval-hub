// @vitest-environment node
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluations", () => ({ addManagerComment: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { addManagerComment } from "@/lib/evaluations";
import { POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makePost(body: unknown) {
  return new Request("http://localhost/api/evaluations/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

const validBody = {
  fiscalYear: 2025,
  evaluateeId: "e1",
  evalItemVersionDetailId: 1,
  evaluatorId: "r1",
  reason: "コメント",
};
const created = {
  id: "c1",
  evaluationId: "eval-1",
  evaluatorId: "r1",
  score: null,
  reason: "コメント",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("POST /api/evaluations/comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("コメント作成して 201 を返す（日付は ISO）", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(addManagerComment).mockResolvedValue(created as never);

    const res = await POST(makePost(validBody));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.id).toBe("c1");
    expect(body.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(addManagerComment).toHaveBeenCalledWith("e1", 2025, 1, "r1", { reason: "コメント" });
  });

  it("必須欠落は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect(
      (await POST(makePost({ fiscalYear: 2025, evaluateeId: "e1", evalItemVersionDetailId: 1 })))
        .status,
    ).toBe(400);
    expect(addManagerComment).not.toHaveBeenCalled();
  });

  it("参照先未存在（FK P2003）は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(addManagerComment).mockRejectedValue(
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
