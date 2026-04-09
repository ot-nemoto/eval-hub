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
  await prisma.user.delete({ where: { email } });
  await deleteClerkUser(email);
  console.log(`  deleted: ${email}`);
}

// ─── メイン ────────────────────────────────────────────────────────────────────

async function main() {
  // =========================================================================
  // 0. 全データをクリーンアップ（FK 順に削除）
  //      マスタデータも含めて全削除し、seed JSON から完全に再構築する
  //      ユーザー・年度マスタ（fiscal_years）は保持する
  //      ※ 旧ユーザー削除（ステップ 0-2）より先に実行することで、
  //        FK 制約によるユーザー削除失敗を防ぐ
  // =========================================================================
  await prisma.evaluation.deleteMany({});
  await prisma.fiscalYearItem.deleteMany({});
  await prisma.evaluationAssignment.deleteMany({});
  await prisma.evaluationSetting.deleteMany({});
  await prisma.evaluationItem.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.target.deleteMany({});
  console.log("all data cleared (evaluations / fiscal_year_items / assignments / settings / items / categories / targets)");

  // =========================================================================
  // 0-2. 旧 seed ユーザーのクリーンアップ（旧メールアドレスのユーザーを DB・Clerk から削除）
  //      ステップ 0 の全削除後に実行するため、FK 制約なしで安全に削除できる
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
  // 2. 年度マスタ（fiscal_years）
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
  const settingsData = [
    { email: "tsukune@example.com", fiscalYear: 2025, selfEvaluationEnabled: true },
    { email: "tebasaki@example.com", fiscalYear: 2025, selfEvaluationEnabled: true },
    { email: "tebasaki@example.com", fiscalYear: 2026, selfEvaluationEnabled: true },
    { email: "tebasaki@example.com", fiscalYear: 2027, selfEvaluationEnabled: true },
    { email: "nankotsu@example.com", fiscalYear: 2025, selfEvaluationEnabled: true },
    { email: "nankotsu@example.com", fiscalYear: 2026, selfEvaluationEnabled: true },
    { email: "nankotsu@example.com", fiscalYear: 2027, selfEvaluationEnabled: true },
  ];
  await prisma.evaluationSetting.createMany({
    data: settingsData.map((s) => ({
      userId: u[s.email].id,
      fiscalYear: s.fiscalYear,
      selfEvaluationEnabled: s.selfEvaluationEnabled,
    })),
  });
  console.log(`evaluation_settings: ${settingsData.length} created`);

  // =========================================================================
  // 4. 評価者アサイン（evaluation_assignments）
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
  await prisma.evaluationAssignment.createMany({
    data: assignmentsData.map((a) => ({
      fiscalYear: a.fiscalYear,
      evaluateeId: u[a.evaluatee].id,
      evaluatorId: u[a.evaluator].id,
    })),
  });
  console.log(`evaluation_assignments: ${assignmentsData.length} created`);

  // =========================================================================
  // 5. 大分類マスタ（targets）
  // =========================================================================
  const targetsData = [
    ...new Map(
      evaluationItemsData.map((d) => [d.target, { name: d.target, no: d.target_no ?? 0 }]),
    ).values(),
  ].sort((a, b) => a.no - b.no);

  await prisma.target.createMany({ data: targetsData });
  console.log(`targets: ${targetsData.length} created`);

  // =========================================================================
  // 6. 中分類マスタ（categories）
  //    seed JSON では (target, category_no) が重複するケースがあるため、
  //    category_name を一意識別子とし、target 内で連番の no を自動付与する
  // =========================================================================
  const allTargets = await prisma.target.findMany();
  const targetByName = Object.fromEntries(allTargets.map((t) => [t.name, t]));

  // target ごとに category_name の出現順で一意リストを構築
  const seenCategoryKeys = new Set<string>();
  const categoriesByTarget = new Map<string, string[]>();
  for (const d of evaluationItemsData) {
    const key = `${d.target}|${d.category}`;
    if (!seenCategoryKeys.has(key)) {
      seenCategoryKeys.add(key);
      if (!categoriesByTarget.has(d.target)) categoriesByTarget.set(d.target, []);
      categoriesByTarget.get(d.target)?.push(d.category);
    }
  }

  // target 内で連番の no を付与
  const categoriesData: { target: string; name: string; no: number }[] = [];
  for (const [target, names] of categoriesByTarget) {
    for (let i = 0; i < names.length; i++) {
      categoriesData.push({ target, name: names[i], no: i + 1 });
    }
  }

  await prisma.category.createMany({
    data: categoriesData.map((c) => ({
      targetId: targetByName[c.target].id,
      name: c.name,
      no: c.no,
    })),
  });
  console.log(`categories: ${categoriesData.length} created`);

  // =========================================================================
  // 7. 評価項目マスタ（evaluation_items）
  //    category は target|category_name で引く
  // =========================================================================
  const allCategories = await prisma.category.findMany({ include: { target: true } });
  const categoryByKey = Object.fromEntries(
    allCategories.map((c) => [`${c.target.name}|${c.name}`, c]),
  );

  // name が空のプレースホルダー行と (target, category, item_no) の重複を除外する
  const seenItemKeys = new Set<string>();
  const deduplicatedItems = evaluationItemsData.filter((item) => {
    if (!item.name || item.name.trim() === "") return false; // 空 name を除外
    const key = `${item.target}|${item.category}|${item.item_no}`;
    if (seenItemKeys.has(key)) return false;
    seenItemKeys.add(key);
    return true;
  });

  await prisma.evaluationItem.createMany({
    data: deduplicatedItems.map((item) => ({
      targetId: targetByName[item.target].id,
      categoryId: categoryByKey[`${item.target}|${item.category}`].id,
      no: item.item_no,
      name: item.name,
      description: item.description ?? null,
      evalCriteria: item.eval_criteria ?? null,
    })),
  });
  console.log(`evaluation_items: ${deduplicatedItems.length} created (${evaluationItemsData.length - deduplicatedItems.length} duplicates skipped)`);

  // =========================================================================
  // 8. fiscal_year_items（年度と評価項目の紐付け）
  //    2026（現在年度）: Recruit カテゴリは「採用広告」1件のみ（T78 フィルタリング動作確認用）
  //    → 評価画面で Recruit が1件しか表示されなければフィルタが正常に機能している
  // =========================================================================
  const allItems = await prisma.evaluationItem.findMany({
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });

  // Recruit カテゴリのうち「採用広告」以外を 2026 から除外
  const recruitExcluded = new Set(
    allItems
      .filter((item) => ["採用計画の作成実施", "紹介会社運用", "入社試験", "応募者フォロー"].includes(item.name))
      .map((item) => item.id),
  );
  const items2026 = allItems.filter((item) => !recruitExcluded.has(item.id));

  await prisma.fiscalYearItem.createMany({
    data: [
      ...allItems.flatMap((item) => [
        { fiscalYear: 2025, evaluationItemId: item.id },
        { fiscalYear: 2027, evaluationItemId: item.id },
      ]),
      ...items2026.map((item) => ({ fiscalYear: 2026, evaluationItemId: item.id })),
    ],
  });
  console.log(
    `fiscal_year_items: created (2025/2027: ${allItems.length}件, 2026: ${items2026.length}件 ※Recruitの4件除外)`,
  );

  // =========================================================================
  // 9. 評価データ（evaluations）
  //    「採点欄は表示されるが編集不可」シナリオの表示確認用に事前データを投入する
  //
  //  tebasaki（2026年度）: 先頭3件に self_score を設定、bonjiri が manager_comment を登録
  //    → 自己評価画面で評価者コメント欄が表示されることを確認できる
  //  nankotsu（2026年度）: 4件目に self_score = null（未入力表示確認用）、先頭3件に self_score のみ設定
  //    → 評価者画面で自己採点欄が表示・編集不可であることを確認できる
  //    → 全ユーザー自己評価一覧で「未入力」表示を確認できる
  // =========================================================================
  if (allItems.length < 4) {
    throw new Error(
      `評価データの投入に必要な評価項目が不足しています（取得件数: ${allItems.length}、必要数: 4）`,
    );
  }
  const seedItems = allItems.slice(0, 4);

  const evaluationsData = [
    // tebasaki: 自己採点あり（評価者コメントは後で登録）
    {
      fiscalYear: 2026,
      evaluateeEmail: "tebasaki@example.com",
      itemId: seedItems[0].id,
      selfScore: "ryo" as const,
      selfReason: "積極的に取り組みました",
    },
    {
      fiscalYear: 2026,
      evaluateeEmail: "tebasaki@example.com",
      itemId: seedItems[1].id,
      selfScore: "ka" as const,
      selfReason: "改善の余地があります",
    },
    {
      fiscalYear: 2026,
      evaluateeEmail: "tebasaki@example.com",
      itemId: seedItems[2].id,
      selfScore: "yu" as const,
      selfReason: "目標を超えて達成できました",
    },
    // nankotsu: 自己採点未入力（未入力表示確認用）
    {
      fiscalYear: 2026,
      evaluateeEmail: "nankotsu@example.com",
      itemId: seedItems[3].id,
      selfScore: null,
      selfReason: null,
    },
    // nankotsu: 自己採点のみ（評価者採点なし）
    {
      fiscalYear: 2026,
      evaluateeEmail: "nankotsu@example.com",
      itemId: seedItems[0].id,
      selfScore: "ka" as const,
      selfReason: "基本的なことはできました",
    },
    {
      fiscalYear: 2026,
      evaluateeEmail: "nankotsu@example.com",
      itemId: seedItems[1].id,
      selfScore: "ryo" as const,
      selfReason: "しっかり対応できました",
    },
    {
      fiscalYear: 2026,
      evaluateeEmail: "nankotsu@example.com",
      itemId: seedItems[2].id,
      selfScore: "ryo" as const,
      selfReason: "チームに貢献できました",
    },
  ];

  await prisma.evaluation.createMany({
    data: evaluationsData.map((e) => ({
      fiscalYear: e.fiscalYear,
      evaluateeId: u[e.evaluateeEmail].id,
      evalItemId: e.itemId,
      selfScore: e.selfScore,
      selfReason: e.selfReason,
    })),
  });
  console.log(`evaluations: ${evaluationsData.length} created`);

  // =========================================================================
  // 10. 評価者コメント（manager_comments）
  //    tebasaki の先頭3件に bonjiri（ADMIN）のコメントを登録
  //    item[0] には tsukune もコメントを登録（複数評価者コメントの確認用）
  // =========================================================================
  const tebasakiEvals = await prisma.evaluation.findMany({
    where: {
      fiscalYear: 2026,
      evaluateeId: u["tebasaki@example.com"].id,
      evalItemId: { in: [seedItems[0].id, seedItems[1].id, seedItems[2].id] },
    },
  });
  const tebasakiEvalMap = Object.fromEntries(
    tebasakiEvals.map((e) => [e.evalItemId, e.id]),
  );
  const managerCommentsData = [
    // item[0]: bonjiri + tsukune の2人がコメント（複数評価者ケース）
    {
      evaluationId: tebasakiEvalMap[seedItems[0].id],
      evaluatorId: u["bonjiri@example.com"].id,
      score: "yu" as const,
      reason: "非常に優秀な取り組みでした",
    },
    {
      evaluationId: tebasakiEvalMap[seedItems[0].id],
      evaluatorId: u["tsukune@example.com"].id,
      score: "ryo" as const,
      reason: "よく頑張っています。さらなる成長を期待しています",
    },
    // item[1]: bonjiri のみ
    {
      evaluationId: tebasakiEvalMap[seedItems[1].id],
      evaluatorId: u["bonjiri@example.com"].id,
      score: "ryo" as const,
      reason: "着実に成長しています",
    },
    // item[2]: bonjiri のみ
    {
      evaluationId: tebasakiEvalMap[seedItems[2].id],
      evaluatorId: u["bonjiri@example.com"].id,
      score: "yu" as const,
      reason: "期待以上の成果でした",
    },
  ];
  await prisma.managerComment.createMany({ data: managerCommentsData });
  console.log(`manager_comments: ${managerCommentsData.length} created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
