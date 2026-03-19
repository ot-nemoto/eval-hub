import { prisma } from "@/lib/prisma";

/**
 * is_current = true の年度を返す。
 * 未設定の場合は null を返す。
 */
export async function getCurrentFiscalYear(): Promise<number | null> {
  const fy = await prisma.fiscalYear.findFirst({
    where: { is_current: true },
    select: { year: true },
  });
  return fy?.year ?? null;
}
