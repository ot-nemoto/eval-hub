// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/evaluation-assignments", () => ({ deleteEvaluationAssignment: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { NotFoundError } from "@/lib/errors";
import { deleteEvaluationAssignment } from "@/lib/evaluation-assignments";
import { DELETE } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

function makeRequest() {
  return new Request("http://localhost/api/evaluation-assignments/a1", {
    method: "DELETE",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}

const ctx = (id = "a1") => ({ params: Promise.resolve({ id }) });

describe("DELETE /api/evaluation-assignments/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("削除して 204 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteEvaluationAssignment).mockResolvedValue(undefined);

    const res = await DELETE(makeRequest(), ctx());
    expect(res.status).toBe(204);
    expect(deleteEvaluationAssignment).toHaveBeenCalledWith("a1");
  });

  it("未存在は 404", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(deleteEvaluationAssignment).mockRejectedValue(
      new NotFoundError("アサインが見つかりません"),
    );
    expect((await DELETE(makeRequest(), ctx())).status).toBe(404);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await DELETE(makeRequest(), ctx())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await DELETE(makeRequest(), ctx())).status).toBe(403);
  });
});
