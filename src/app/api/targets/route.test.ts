// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/targets", () => ({ getTargets: vi.fn(), createTarget: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { ConflictError } from "@/lib/errors";
import { createTarget, getTargets } from "@/lib/targets";
import { GET, POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };
const target = { id: 1, name: "社員", no: 1, index: 1 };

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/targets", {
    method: body !== undefined ? "POST" : "GET",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as import("next/server").NextRequest;
}

describe("GET /api/targets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ADMIN は一覧を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getTargets).mockResolvedValue([target]);

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ targets: [target] });
  });

  it("キー無効は 401", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeRequest())).status).toBe(401);
  });

  it("MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeRequest())).status).toBe(403);
  });
});

describe("POST /api/targets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("作成して 201 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createTarget).mockResolvedValue(target);

    const res = await POST(makeRequest({ name: "社員" }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body).toEqual(target);
    expect(createTarget).toHaveBeenCalledWith({ name: "社員" });
  });

  it("name 欠落は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(createTarget).not.toHaveBeenCalled();
  });

  it("name 空文字・空白のみは 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makeRequest({ name: "" }))).status).toBe(400);
    expect((await POST(makeRequest({ name: "   " }))).status).toBe(400);
    expect(createTarget).not.toHaveBeenCalled();
  });

  it("no 重複（ConflictError）は 409", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createTarget).mockRejectedValue(
      new ConflictError("同じ no の大分類がすでに存在します"),
    );

    const res = await POST(makeRequest({ name: "社員" }));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe("同じ no の大分類がすでに存在します");
  });

  it("キー無効は 401", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await POST(makeRequest({ name: "社員" }))).status).toBe(401);
  });

  it("MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await POST(makeRequest({ name: "社員" }))).status).toBe(403);
  });
});
