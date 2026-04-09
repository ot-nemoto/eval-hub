import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const FISCAL_YEAR_COOKIE = "fiscal_year";

/**
 * 選択中の評価年度を返す。
 * Cookie に有効な年度が設定されていればそれを優先し、
 * なければ is_current = true の年度を返す。
 * 未設定・無効な場合は null を返す。
 */
export async function getCurrentFiscalYear(): Promise<number | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(FISCAL_YEAR_COOKIE)?.value;
  const cookieYear =
    cookieValue && /^\d{4}$/.test(cookieValue)
      ? parseInt(cookieValue, 10)
      : null;

  if (cookieYear) {
    const fy = await prisma.fiscalYear.findUnique({
      where: { year: cookieYear },
      select: { year: true },
    });
    if (fy) return fy.year;
  }

  const fy = await prisma.fiscalYear.findFirst({
    where: { isCurrent: true },
    select: { year: true },
  });
  return fy?.year ?? null;
}
