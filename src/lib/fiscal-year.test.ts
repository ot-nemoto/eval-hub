// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fiscalYear: { findFirst: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getCurrentFiscalYear } from "./fiscal-year";

describe("getCurrentFiscalYear", () => {
  beforeEach(() => vi.clearAllMocks());

  it("isCurrent=true の年度を返す", async () => {
    vi.mocked(prisma.fiscalYear.findFirst).mockResolvedValue({ year: 2026 } as never);
    expect(await getCurrentFiscalYear()).toBe(2026);
  });

  it("isCurrent=true の年度がない場合は null を返す", async () => {
    vi.mocked(prisma.fiscalYear.findFirst).mockResolvedValue(null);
    expect(await getCurrentFiscalYear()).toBeNull();
  });
});
