// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    fiscalYearItem: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "admin" } };
const memberSession = { user: { id: "member-1", role: "member" } };
const mockItem = { fiscalYear: 2026, evaluationItemId: 1 };

function makeParams(year: string, itemId: string) {
  return { params: Promise.resolve({ year, itemId }) };
}

describe("DELETE /api/admin/fiscal-years/:year/items/:itemId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("紐づきを削除して 204 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYearItem.findUnique).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.fiscalYearItem.delete).mockResolvedValue(mockItem as never);

    const req = new Request("http://localhost/api/admin/fiscal-years/2026/items/1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("2026", "1"));
    expect(res.status).toBe(204);
  });

  it("未認証の場合は 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/fiscal-years/2026/items/1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("2026", "1"));
    expect(res.status).toBe(401);
  });

  it("admin 以外は 403", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    const req = new Request("http://localhost/api/admin/fiscal-years/2026/items/1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("2026", "1"));
    expect(res.status).toBe(403);
  });

  it("存在しない紐づきは 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.fiscalYearItem.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/fiscal-years/2026/items/999", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("2026", "999"));
    expect(res.status).toBe(404);
  });
});
