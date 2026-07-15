// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/fiscal-years", () => ({ getFiscalYears: vi.fn(), createFiscalYear: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { BadRequestError, ConflictError } from "@/lib/errors";
import { createFiscalYear, getFiscalYears } from "@/lib/fiscal-years";
import { GET, POST } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

const libFy = {
  year: 2025,
  name: "2025年度",
  startDate: new Date("2025-04-01"),
  endDate: new Date("2026-03-31"),
  isCurrent: true,
  isLocked: false,
  evalItemVersionId: null,
};
const serialized = {
  year: 2025,
  name: "2025年度",
  startDate: "2025-04-01",
  endDate: "2026-03-31",
  isCurrent: true,
  isLocked: false,
  evalItemVersionId: null,
};

function makeGet() {
  return new Request("http://localhost/api/fiscal-years", {
    method: "GET",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}
function makePost(body: unknown) {
  return new Request("http://localhost/api/fiscal-years", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer key" },
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

const validBody = {
  year: 2025,
  name: "2025年度",
  startDate: "2025-04-01",
  endDate: "2026-03-31",
};

describe("GET /api/fiscal-years", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ADMIN は一覧を返す（日付は YYYY-MM-DD）", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getFiscalYears).mockResolvedValue([libFy] as never);

    const res = await GET(makeGet());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ fiscalYears: [serialized] });
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeGet())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeGet())).status).toBe(403);
  });
});

describe("POST /api/fiscal-years", () => {
  beforeEach(() => vi.clearAllMocks());

  it("作成して 201 を返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createFiscalYear).mockResolvedValue(libFy as never);

    const res = await POST(makePost(validBody));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body).toEqual(serialized);
    expect(createFiscalYear).toHaveBeenCalledWith(validBody);
  });

  it("year 範囲外は 400（Zod）", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makePost({ ...validBody, year: 1800 }))).status).toBe(400);
    expect(createFiscalYear).not.toHaveBeenCalled();
  });

  it("name 空・必須欠落は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    expect((await POST(makePost({ ...validBody, name: "" }))).status).toBe(400);
    expect((await POST(makePost({ year: 2025, name: "x" }))).status).toBe(400);
  });

  it("日付不正（lib）は 400", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createFiscalYear).mockRejectedValue(
      new BadRequestError("startDate は endDate 以前の日付を指定してください"),
    );
    expect((await POST(makePost(validBody))).status).toBe(400);
  });

  it("年度重複は 409", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(createFiscalYear).mockRejectedValue(new ConflictError("同じ年度がすでに存在します"));
    expect((await POST(makePost(validBody))).status).toBe(409);
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await POST(makePost(validBody))).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await POST(makePost(validBody))).status).toBe(403);
  });
});
