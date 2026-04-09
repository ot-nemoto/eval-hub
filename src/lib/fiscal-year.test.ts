// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fiscalYear: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentFiscalYear } from "./fiscal-year";

function mockCookies(value: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockReturnValue(value ? { value } : undefined),
  } as never);
}

describe("getCurrentFiscalYear", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Cookie に有効な年度が設定されている場合はその年度を返す", async () => {
    mockCookies("2025");
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue({ year: 2025 } as never);
    expect(await getCurrentFiscalYear()).toBe(2025);
    expect(prisma.fiscalYear.findFirst).not.toHaveBeenCalled();
  });

  it("Cookie の年度が DB に存在しない場合は isCurrent=true の年度を返す", async () => {
    mockCookies("9999");
    vi.mocked(prisma.fiscalYear.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.fiscalYear.findFirst).mockResolvedValue({ year: 2026 } as never);
    expect(await getCurrentFiscalYear()).toBe(2026);
  });

  it("Cookie なし・isCurrent=true の年度がある場合はその年度を返す", async () => {
    mockCookies(undefined);
    vi.mocked(prisma.fiscalYear.findFirst).mockResolvedValue({ year: 2026 } as never);
    expect(await getCurrentFiscalYear()).toBe(2026);
    expect(prisma.fiscalYear.findUnique).not.toHaveBeenCalled();
  });

  it("Cookie なし・isCurrent=true の年度がない場合は null を返す", async () => {
    mockCookies(undefined);
    vi.mocked(prisma.fiscalYear.findFirst).mockResolvedValue(null);
    expect(await getCurrentFiscalYear()).toBeNull();
  });
});
