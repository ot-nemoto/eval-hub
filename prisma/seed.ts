import { createClerkClient } from "@clerk/backend";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import evaluationItemsData from "./seeds/evaluation_items.json";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const clerkClient =
  process.env.NODE_ENV !== "production" && process.env.CLERK_SECRET_KEY
    ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    : null;

// ─── Clerk ヘルパー ────────────────────────────────────────────────────────────

async function syncClerkUser(email: string): Promise<string | null> {
  if (!clerkClient) {
    if (process.env.NODE_ENV === "production") {
      console.warn("  本番環境のため Clerk ユーザー作成をスキップします");
    } else {
      console.warn("  CLERK_SECRET_KEY が未設定のため Clerk ユーザー作成をスキップします");
    }
    return null;
  }
  const existing = await clerkClient.users.getUserList({ emailAddress: [email] });
  if (existing.data.length > 0) return existing.data[0].id;
  const created = await clerkClient.users.createUser({
    emailAddress: [email],
    password: "Yakitori2026",
    skipPasswordChecks: true,
  });
  return created.id;
}

async function deleteClerkUser(email: string): Promise<void> {
  if (!clerkClient) return;
  const existing = await clerkClient.users.getUserList({ emailAddress: [email] });
  for (const u of existing.data) {
    await clerkClient.users.deleteUser(u.id);
  }
}

// ─── クリーンアップ ────────────────────────────────────────────────────────────

async function cleanupUser(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  await prisma.evaluationAssignment.deleteMany({
    where: { OR: [{ evaluateeId: user.id }, { evaluatorId: user.id }] },
  });
  await prisma.evaluation.deleteMany({ where: { evaluateeId: user.id } });
  await prisma.evaluationSetting.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { email } });
  await deleteClerkUser(email);
  console.log(`  deleted: ${email}`);
}

// ─── 年度マスタ ────────────────────────────────────────────────────────────────

async function seedFiscalYearItems(allItemIds: number[]) {
  const years = [2025, 2026, 2027];
  for (const year of years) {
    await prisma.fiscalYearItem.createMany({
      data: allItemIds.map((id) => ({ fiscalYear: year, evaluationItemId: id })),
      skipDuplicates: true,
    });
  }
  console.log(`fiscal_year_items: upserted for ${years.join(", ")}`);
}

// ─── メイン ────────────────────────────────────────────────────────────────────

async function main() {
  // =========================================================================
  // 0. 旧 seed ユーザーのクリーンアップ（旧メールアドレスのユーザーを DB・Clerk から削除）
  // =========================================================================
  const oldEmails = [
    // 旧ユーザー（ドカベンキャラクター）
    "doigaki@example.com",
    "shiranui@example.com",
    "yamada@example.com",
    "satonaka@example.com",
    "iwaki@example.com",
    // さらに旧ユーザー
    "tanaka@example.com",
    "suzuki@example.com",
    "sato@example.com",
  ];
  for (const email of oldEmails) await cleanupUser(email);

  // =========================================================================
  // 0-2. 現 seed ユーザーの可変データを初期化
  //      E2E テストで追加されたデータを毎回クリーンな状態に戻す
  //      （ユーザー自体は削除しない。Clerk ユーザーも保持する）
  // =========================================================================
  const seedEmails = [
    "bonjiri@example.com",
    "tsukune@example.com",
    "tebasaki@example.com",
    "nankotsu@example.com",
    "sunagimo@example.com",
    "torikawa@example.com",
  ];
  for (const email of seedEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) continue;
    await prisma.evaluation.deleteMany({ where: { evaluateeId: user.id } });
    await prisma.evaluationAssignment.deleteMany({
      where: { OR: [{ evaluateeId: user.id }, { evaluatorId: user.id }] },
    });
    await prisma.evaluationSetting.deleteMany({ where: { userId: user.id } });
  }
  console.log("seed users: evaluations / assignments / settings cleared");

  // =========================================================================
  // 1. ユーザー
  //
  // ┌──────────────────────────┬────────┬──────────┬───────────────────────────────────────────────┐
  // │ email                    │ role   │ isActive │ 概要                                          │
  // ├──────────────────────────┼────────┼──────────┼───────────────────────────────────────────────┤
  // │ bonjiri@example.com      │ ADMIN  │ true     │ 自己評価なし・評価アサインなし（管理操作確認用）│
  // │ tsukune@example.com      │ ADMIN  │ true     │ 2025のみ自己評価あり・上長: bonjiri            │
  // │ tebasaki@example.com     │ MEMBER │ true     │ 通年自己評価あり・上長: bonjiri（通年）        │
  // │                          │        │          │                       tsukune（2026〜）        │
  // │ nankotsu@example.com     │ MEMBER │ true     │ 通年自己評価あり・上長: tsukune・tebasaki      │
  // │ sunagimo@example.com     │ MEMBER │ false    │ 無効化ユーザー（auth-error テスト用）          │
  // │ torikawa@example.com     │ MEMBER │ true     │ 評価なし・アサインなし（削除テスト用）         │
  // └──────────────────────────┴────────┴──────────┴───────────────────────────────────────────────┘
  //
  // 共通パスワード: Yakitori2026
  // =========================================================================
  const usersData = [
    { email: "bonjiri@example.com", name: "bonjiri", role: "ADMIN" as const, isActive: true },
    { email: "tsukune@example.com", name: "tsukune", role: "ADMIN" as const, isActive: true },
    { email: "tebasaki@example.com", name: "tebasaki", role: "MEMBER" as const, isActive: true },
    { email: "nankotsu@example.com", name: "nankotsu", role: "MEMBER" as const, isActive: true },
    { email: "sunagimo@example.com", name: "sunagimo", role: "MEMBER" as const, isActive: false },
    { email: "torikawa@example.com", name: "torikawa", role: "MEMBER" as const, isActive: true },
  ];

  const u: Record<string, { id: string }> = {};
  for (const data of usersData) {
    const clerkId = await syncClerkUser(data.email);
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        role: data.role,
        isActive: data.isActive,
        ...(clerkId ? { clerkId } : {}),
      },
      create: {
        email: data.email,
        name: data.name,
        role: data.role,
        isActive: data.isActive,
        ...(clerkId ? { clerkId } : {}),
      },
    });
    u[data.email] = user;
  }
  console.log(`users: ${usersData.length} upserted`);

  // =========================================================================
  // 2. 年度マスタ（fiscal_years のみ、fiscal_year_items は後で登録）
  // =========================================================================
  const fiscalYearsBase = [
    {
      year: 2025,
      name: "2025年度",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-03-31"),
      isCurrent: false,
    },
    {
      year: 2026,
      name: "2026年度",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      isCurrent: true,
    },
    {
      year: 2027,
      name: "2027年度",
      startDate: new Date("2027-04-01"),
      endDate: new Date("2028-03-31"),
      isCurrent: false,
    },
  ];
  for (const fy of fiscalYearsBase) {
    await prisma.fiscalYear.upsert({
      where: { year: fy.year },
      update: {
        name: fy.name,
        startDate: fy.startDate,
        endDate: fy.endDate,
        isCurrent: fy.isCurrent,
      },
      create: fy,
    });
  }
  await prisma.fiscalYear.updateMany({
    where: { year: { not: 2026 } },
    data: { isCurrent: false },
  });
  console.log(`fiscal_years: ${fiscalYearsBase.length} upserted`);

  // =========================================================================
  // 3. 自己評価要否設定（evaluation_settings）
  //    デフォルト false のため、true にしたい年度のみ明示的に登録する
  //
  //              │ 2025  │ 2026  │ 2027
  //  ────────────┼───────┼───────┼──────
  //  bonjiri     │ false │ false │ false  ← デフォルトのため登録不要
  //  tsukune     │ true  │ false │ false  ← 2025 のみ登録
  //  tebasaki    │ true  │ true  │ true
  //  nankotsu    │ true  │ true  │ true
  //  sunagimo    │ false │ false │ false  ← デフォルトのため登録不要
  //  torikawa    │ false │ false │ false  ← デフォルトのため登録不要
  // =========================================================================
  const settingsData: { email: string; fiscalYear: number; selfEvaluationEnabled: boolean }[] = [
    { email: "tsukune@example.com", fiscalYear: 2025, selfEvaluationEnabled: true },
    { email: "tebasaki@example.com", fiscalYear: 2025, selfEvaluationEnabled: true },
    { email: "tebasaki@example.com", fiscalYear: 2026, selfEvaluationEnabled: true },
    { email: "tebasaki@example.com", fiscalYear: 2027, selfEvaluationEnabled: true },
    { email: "nankotsu@example.com", fiscalYear: 2025, selfEvaluationEnabled: true },
    { email: "nankotsu@example.com", fiscalYear: 2026, selfEvaluationEnabled: true },
    { email: "nankotsu@example.com", fiscalYear: 2027, selfEvaluationEnabled: true },
  ];

  for (const s of settingsData) {
    await prisma.evaluationSetting.upsert({
      where: { userId_fiscalYear: { userId: u[s.email].id, fiscalYear: s.fiscalYear } },
      update: { selfEvaluationEnabled: s.selfEvaluationEnabled },
      create: {
        userId: u[s.email].id,
        fiscalYear: s.fiscalYear,
        selfEvaluationEnabled: s.selfEvaluationEnabled,
      },
    });
  }
  console.log(`evaluation_settings: ${settingsData.length} upserted`);

  // =========================================================================
  // 3. 評価者アサイン（evaluation_assignments）
  //
  //  年度  │ 被評価者  │ 評価者（上長）
  //  ──────┼───────────┼────────────────
  //  2025  │ tsukune   │ bonjiri
  //  2025  │ tebasaki  │ bonjiri
  //  2025  │ nankotsu  │ tsukune
  //  2025  │ nankotsu  │ tebasaki
  //  2026  │ tebasaki  │ bonjiri
  //  2026  │ tebasaki  │ tsukune
  //  2026  │ nankotsu  │ tsukune
  //  2026  │ nankotsu  │ tebasaki
  // =========================================================================
  const assignmentsData = [
    // 2025
    { fiscalYear: 2025, evaluatee: "tsukune@example.com", evaluator: "bonjiri@example.com" },
    { fiscalYear: 2025, evaluatee: "tebasaki@example.com", evaluator: "bonjiri@example.com" },
    { fiscalYear: 2025, evaluatee: "nankotsu@example.com", evaluator: "tsukune@example.com" },
    { fiscalYear: 2025, evaluatee: "nankotsu@example.com", evaluator: "tebasaki@example.com" },
    // 2026
    { fiscalYear: 2026, evaluatee: "tebasaki@example.com", evaluator: "bonjiri@example.com" },
    { fiscalYear: 2026, evaluatee: "tebasaki@example.com", evaluator: "tsukune@example.com" },
    { fiscalYear: 2026, evaluatee: "nankotsu@example.com", evaluator: "tsukune@example.com" },
    { fiscalYear: 2026, evaluatee: "nankotsu@example.com", evaluator: "tebasaki@example.com" },
  ];

  for (const a of assignmentsData) {
    await prisma.evaluationAssignment.upsert({
      where: {
        fiscalYear_evaluateeId_evaluatorId: {
          fiscalYear: a.fiscalYear,
          evaluateeId: u[a.evaluatee].id,
          evaluatorId: u[a.evaluator].id,
        },
      },
      update: {},
      create: {
        fiscalYear: a.fiscalYear,
        evaluateeId: u[a.evaluatee].id,
        evaluatorId: u[a.evaluator].id,
      },
    });
  }
  console.log(`evaluation_assignments: ${assignmentsData.length} upserted`);

  // =========================================================================
  // 4. 評価項目マスタ（evaluation_items）
  // =========================================================================
  const targetsData = [
    ...new Map(
      evaluationItemsData.map((d) => [d.target, { name: d.target, no: d.target_no ?? 0 }]),
    ).values(),
  ].sort((a, b) => a.no - b.no);

  for (const t of targetsData) {
    await prisma.target.upsert({
      where: { no: t.no },
      update: { name: t.name },
      create: { name: t.name, no: t.no },
    });
  }
  console.log(`targets: ${targetsData.length} upserted`);

  // =========================================================================
  // 6. 中分類マスタ（categories）
  // =========================================================================
  const allTargets = await prisma.target.findMany();
  const targetByName = Object.fromEntries(allTargets.map((t) => [t.name, t]));

  const categoriesData = [
    ...new Map(
      evaluationItemsData.map((d) => [
        `${d.target}|${d.category}`,
        { target: d.target, name: d.category, no: d.category_no ?? 0 },
      ]),
    ).values(),
  ].sort((a, b) => a.no - b.no);

  for (const c of categoriesData) {
    const target = targetByName[c.target];
    await prisma.category.upsert({
      where: { targetId_no: { targetId: target.id, no: c.no } },
      update: { name: c.name },
      create: { targetId: target.id, name: c.name, no: c.no },
    });
  }
  console.log(`categories: ${categoriesData.length} upserted`);

  // =========================================================================
  // 7. 評価項目マスタ（evaluation_items）
  // =========================================================================
  const allCategories = await prisma.category.findMany({ include: { target: true } });
  const categoryKey = (targetName: string, categoryName: string) => `${targetName}|${categoryName}`;
  const categoryByKey = Object.fromEntries(
    allCategories.map((c) => [categoryKey(c.target.name, c.name), c]),
  );

  for (const item of evaluationItemsData) {
    const target = targetByName[item.target];
    const category = categoryByKey[categoryKey(item.target, item.category)];
    await prisma.evaluationItem.upsert({
      where: { categoryId_no: { categoryId: category.id, no: item.item_no } },
      update: {
        targetId: target.id,
        name: item.name,
        description: item.description ?? null,
        evalCriteria: item.eval_criteria ?? null,
      },
      create: {
        targetId: target.id,
        categoryId: category.id,
        no: item.item_no,
        name: item.name,
        description: item.description ?? null,
        evalCriteria: item.eval_criteria ?? null,
      },
    });
  }
  console.log(`evaluation_items: ${evaluationItemsData.length} upserted`);

  // =========================================================================
  // 8. fiscal_year_items（年度と評価項目の紐付け）
  // =========================================================================
  const allItems = await prisma.evaluationItem.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  await seedFiscalYearItems(allItems.map((i) => i.id));

  // =========================================================================
  // 9. 評価データ（evaluations）
  //    「採点欄は表示されるが編集不可」シナリオの表示確認用に事前データを投入する
  //
  //  tebasaki（2026年度）: 先頭3件に self_score + manager_score を設定
  //    → 自己評価画面で評価者採点欄が表示・編集不可であることを確認できる
  //  nankotsu（2026年度）: 先頭3件に self_score のみ設定
  //    → 評価者画面で自己採点欄が表示・編集不可であることを確認できる
  // =========================================================================
  if (allItems.length < 3) {
    throw new Error(
      `評価データの投入に必要な評価項目が不足しています（取得件数: ${allItems.length}、必要数: 3）`,
    );
  }
  const seedItems = allItems.slice(0, 3);

  const evaluationsData: {
    fiscalYear: number;
    evaluateeEmail: string;
    itemId: number;
    selfScore: "ka" | "ryo" | "yu" | null;
    selfReason: string | null;
    managerScore: "ka" | "ryo" | "yu" | null;
    managerReason: string | null;
  }[] = [
    // tebasaki: 自己採点 + 評価者採点あり
    {
      fiscalYear: 2026,
      evaluateeEmail: "tebasaki@example.com",
      itemId: seedItems[0].id,
      selfScore: "ryo",
      selfReason: "積極的に取り組みました",
      managerScore: "yu",
      managerReason: "非常に優秀な取り組みでした",
    },
    {
      fiscalYear: 2026,
      evaluateeEmail: "tebasaki@example.com",
      itemId: seedItems[1].id,
      selfScore: "ka",
      selfReason: "改善の余地があります",
      managerScore: "ryo",
      managerReason: "着実に成長しています",
    },
    {
      fiscalYear: 2026,
      evaluateeEmail: "tebasaki@example.com",
      itemId: seedItems[2].id,
      selfScore: "yu",
      selfReason: "目標を超えて達成できました",
      managerScore: "yu",
      managerReason: "期待以上の成果でした",
    },
    // nankotsu: 自己採点のみ（評価者採点なし）
    {
      fiscalYear: 2026,
      evaluateeEmail: "nankotsu@example.com",
      itemId: seedItems[0].id,
      selfScore: "ka",
      selfReason: "基本的なことはできました",
      managerScore: null,
      managerReason: null,
    },
    {
      fiscalYear: 2026,
      evaluateeEmail: "nankotsu@example.com",
      itemId: seedItems[1].id,
      selfScore: "ryo",
      selfReason: "しっかり対応できました",
      managerScore: null,
      managerReason: null,
    },
    {
      fiscalYear: 2026,
      evaluateeEmail: "nankotsu@example.com",
      itemId: seedItems[2].id,
      selfScore: "ryo",
      selfReason: "チームに貢献できました",
      managerScore: null,
      managerReason: null,
    },
  ];

  for (const e of evaluationsData) {
    await prisma.evaluation.upsert({
      where: {
        fiscalYear_evaluateeId_evalItemId: {
          fiscalYear: e.fiscalYear,
          evaluateeId: u[e.evaluateeEmail].id,
          evalItemId: e.itemId,
        },
      },
      update: {
        selfScore: e.selfScore,
        selfReason: e.selfReason,
        managerScore: e.managerScore,
        managerReason: e.managerReason,
      },
      create: {
        fiscalYear: e.fiscalYear,
        evaluateeId: u[e.evaluateeEmail].id,
        evalItemId: e.itemId,
        selfScore: e.selfScore,
        selfReason: e.selfReason,
        managerScore: e.managerScore,
        managerReason: e.managerReason,
      },
    });
  }
  console.log(`evaluations: ${evaluationsData.length} upserted`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
