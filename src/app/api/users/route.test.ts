// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/users", () => ({ getUsers: vi.fn() }));

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getUsers } from "@/lib/users";
import { GET } from "./route";

const adminUser = { id: "u1", role: "ADMIN" as const, isActive: true };
const memberUser = { id: "u2", role: "MEMBER" as const, isActive: true };

const libUser = {
  id: "user-1",
  name: "田中",
  email: "tanaka@example.com",
  role: "MEMBER" as const,
  division: "開発部",
  joinedAt: new Date("2020-04-01"),
  createdAt: new Date("2020-04-01T09:00:00Z"),
  isActive: true,
};

function makeGet() {
  return new Request("http://localhost/api/users", {
    method: "GET",
    headers: { authorization: "Bearer key" },
  }) as import("next/server").NextRequest;
}

describe("GET /api/users", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ADMIN は一覧を返す（joinedAt は YYYY-MM-DD・createdAt は ISO）", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getUsers).mockResolvedValue([libUser] as never);

    const res = await GET(makeGet());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.users[0]).toEqual({
      id: "user-1",
      name: "田中",
      email: "tanaka@example.com",
      role: "MEMBER",
      division: "開発部",
      joinedAt: "2020-04-01",
      createdAt: "2020-04-01T09:00:00.000Z",
      isActive: true,
    });
  });

  it("joinedAt が null でもそのまま返す", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(adminUser);
    vi.mocked(getUsers).mockResolvedValue([{ ...libUser, joinedAt: null }] as never);

    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.users[0].joinedAt).toBeNull();
  });

  it("キー無効は 401 / MEMBER は 403", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    expect((await GET(makeGet())).status).toBe(401);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(memberUser);
    expect((await GET(makeGet())).status).toBe(403);
  });
});
