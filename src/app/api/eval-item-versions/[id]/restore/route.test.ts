// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/eval-item-versions", () => ({ restoreEvalItemVersion: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { restoreEvalItemVersion } from "@/lib/eval-item-versions";
import { POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makeRequest(query = "?confirm=true") {
  return new Request(`http://localhost/api/eval-item-versions/1/restore${query}`, {
    method: "POST",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}

const ctx = (id = "1") => ({ params: Promise.resolve({ id }) });

describe("POST /api/eval-item-versions/[id]/restore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("復元して 204 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(restoreEvalItemVersion).mockResolvedValue(undefined);

    const res = await POST(makeRequest(), ctx());
    expect(res.status).toBe(204);
    expect(restoreEvalItemVersion).toHaveBeenCalledWith(1);
  });

  it("未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(restoreEvalItemVersion).mockRejectedValue(
      new NotFoundError("バージョンが見つかりません"),
    );
    expect((await POST(makeRequest(), ctx())).status).toBe(404);
  });

  it("詳細なし（lib BadRequest）は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(restoreEvalItemVersion).mockRejectedValue(
      new BadRequestError("バージョンに詳細がありません"),
    );
    expect((await POST(makeRequest(), ctx())).status).toBe(400);
  });

  it("id 不正は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makeRequest(), ctx("abc"))).status).toBe(400);
    expect(restoreEvalItemVersion).not.toHaveBeenCalled();
  });

  it("confirm=true がないと 400（破壊的操作ガード）", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makeRequest(""), ctx())).status).toBe(400);
    expect((await POST(makeRequest("?confirm=false"), ctx())).status).toBe(400);
    expect(restoreEvalItemVersion).not.toHaveBeenCalled();
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await POST(makeRequest(), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await POST(makeRequest(), ctx())).status).toBe(403);
  });
});
