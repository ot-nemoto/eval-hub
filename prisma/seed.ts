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
    password: "EvalHub#Dev2026!",
    skipPasswordChecks: false,
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
    where: { OR: [{ evaluatee_id: user.id }, { evaluator_id: user.id }] },
  });
  await prisma.evaluation.deleteMany({ where: { evaluatee_id: user.id } });
  await prisma.evaluationSetting.deleteMany({ where: { user_id: user.id } });
  await prisma.user.delete({ where: { email } });
  await deleteClerkUser(email);
  console.log(`  deleted: ${email}`);
}

// ─── 年度マスタ ────────────────────────────────────────────────────────────────

async function seedFiscalYears(allItemUids: string[]) {
  const fiscalYearsData = [
    {
      year: 2025,
      name: "2025年度",
      start_date: new Date("2025-04-01"),
      end_date: new Date("2026-03-31"),
      is_current: false,
    },
    {
      year: 2026,
      name: "2026年度",
      start_date: new Date("2026-04-01"),
      end_date: new Date("2027-03-31"),
      is_current: true,
    },
    {
      year: 2027,
      name: "2027年度",
      start_date: new Date("2027-04-01"),
      end_date: new Date("2028-03-31"),
      is_current: false,
    },
  ];

  for (const fy of fiscalYearsData) {
    await prisma.fiscalYear.upsert({
      where: { year: fy.year },
      update: {
        name: fy.name,
        start_date: fy.start_date,
        end_date: fy.end_date,
        is_current: fy.is_current,
      },
      create: fy,
    });

    // 全評価項目を各年度に紐付け
    await prisma.fiscalYearItem.createMany({
      data: allItemUids.map((uid) => ({ fiscal_year: fy.year, evaluation_item_uid: uid })),
      skipDuplicates: true,
    });
  }

  // is_current の排他制御（2026年度のみ true）
  await prisma.fiscalYear.updateMany({
    where: { year: { not: 2026 } },
    data: { is_current: false },
  });

  console.log(`fiscal_years: ${fiscalYearsData.length} upserted`);
}

// ─── メイン ────────────────────────────────────────────────────────────────────

async function main() {
  // =========================================================================
  // 0. 旧 seed ユーザーのクリーンアップ
  // =========================================================================
  const oldEmails = ["tanaka@example.com", "suzuki@example.com", "sato@example.com"];
  for (const email of oldEmails) await cleanupUser(email);

  // =========================================================================
  // 1. ユーザー
  //
  // ┌─────────────┬────────┬──────────────────────────────────────────┐
  // │ 氏名        │ ロール │ 概要                                     │
  // ├─────────────┼────────┼──────────────────────────────────────────┤
  // │ 土井垣将    │ admin  │ 自己評価なし。評価アサインなし           │
  // │ 不知火守    │ admin  │ 2025のみ自己評価あり。上長: 土井垣       │
  // │ 山田太郎    │ member │ 通年自己評価あり。上長: 土井垣（通年）   │
  // │             │        │                 不知火（2026〜）         │
  // │ 里中智      │ member │ 通年自己評価あり。上長: 不知火・山田     │
  // │ 岩鬼正美    │ member │ 通年自己評価なし。評価アサインなし       │
  // └─────────────┴────────┴──────────────────────────────────────────┘
  // =========================================================================
  const usersData = [
    { email: "doigaki@example.com", name: "土井垣将", role: "admin" as const },
    { email: "shiranui@example.com", name: "不知火守", role: "admin" as const },
    { email: "yamada@example.com", name: "山田太郎", role: "member" as const },
    { email: "satonaka@example.com", name: "里中智", role: "member" as const },
    { email: "iwaki@example.com", name: "岩鬼正美", role: "member" as const },
  ];

  const u: Record<string, { id: string }> = {};
  for (const data of usersData) {
    const clerkId = await syncClerkUser(data.email);
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: { name: data.name, role: data.role, ...(clerkId ? { clerk_id: clerkId } : {}) },
      create: {
        email: data.email,
        name: data.name,
        role: data.role,
        ...(clerkId ? { clerk_id: clerkId } : {}),
      },
    });
    u[data.email] = user;
  }
  console.log(`users: ${usersData.length} upserted`);

  // =========================================================================
  // 2. 自己評価要否設定（evaluation_settings）
  //    デフォルト false のため、true にしたい年度のみ明示的に登録する
  //
  //              │ 2025  │ 2026  │ 2027
  //  ────────────┼───────┼───────┼──────
  //  土井垣将    │ false │ false │ false  ← デフォルトのため登録不要
  //  不知火守    │ true  │ false │ false  ← 2025 のみ登録
  //  山田太郎    │ true  │ true  │ true
  //  里中智      │ true  │ true  │ true
  //  岩鬼正美    │ false │ false │ false  ← デフォルトのため登録不要
  // =========================================================================
  const settingsData: { email: string; fiscal_year: number; self_evaluation_enabled: boolean }[] = [
    { email: "shiranui@example.com", fiscal_year: 2025, self_evaluation_enabled: true },
    { email: "yamada@example.com", fiscal_year: 2025, self_evaluation_enabled: true },
    { email: "yamada@example.com", fiscal_year: 2026, self_evaluation_enabled: true },
    { email: "yamada@example.com", fiscal_year: 2027, self_evaluation_enabled: true },
    { email: "satonaka@example.com", fiscal_year: 2025, self_evaluation_enabled: true },
    { email: "satonaka@example.com", fiscal_year: 2026, self_evaluation_enabled: true },
    { email: "satonaka@example.com", fiscal_year: 2027, self_evaluation_enabled: true },
  ];

  for (const s of settingsData) {
    await prisma.evaluationSetting.upsert({
      where: { user_id_fiscal_year: { user_id: u[s.email].id, fiscal_year: s.fiscal_year } },
      update: { self_evaluation_enabled: s.self_evaluation_enabled },
      create: {
        user_id: u[s.email].id,
        fiscal_year: s.fiscal_year,
        self_evaluation_enabled: s.self_evaluation_enabled,
      },
    });
  }
  console.log(`evaluation_settings: ${settingsData.length} upserted`);

  // =========================================================================
  // 3. 評価者アサイン（evaluation_assignments）
  //
  //  年度  │ 被評価者  │ 評価者（上長）
  //  ──────┼───────────┼────────────────
  //  2025  │ 不知火守  │ 土井垣将
  //  2025  │ 山田太郎  │ 土井垣将
  //  2025  │ 里中智    │ 不知火守
  //  2025  │ 里中智    │ 山田太郎
  //  2026  │ 山田太郎  │ 土井垣将
  //  2026  │ 山田太郎  │ 不知火守
  //  2026  │ 里中智    │ 不知火守
  //  2026  │ 里中智    │ 山田太郎
  // =========================================================================
  const assignmentsData = [
    // 2025
    { fiscal_year: 2025, evaluatee: "shiranui@example.com", evaluator: "doigaki@example.com" },
    { fiscal_year: 2025, evaluatee: "yamada@example.com", evaluator: "doigaki@example.com" },
    { fiscal_year: 2025, evaluatee: "satonaka@example.com", evaluator: "shiranui@example.com" },
    { fiscal_year: 2025, evaluatee: "satonaka@example.com", evaluator: "yamada@example.com" },
    // 2026
    { fiscal_year: 2026, evaluatee: "yamada@example.com", evaluator: "doigaki@example.com" },
    { fiscal_year: 2026, evaluatee: "yamada@example.com", evaluator: "shiranui@example.com" },
    { fiscal_year: 2026, evaluatee: "satonaka@example.com", evaluator: "shiranui@example.com" },
    { fiscal_year: 2026, evaluatee: "satonaka@example.com", evaluator: "yamada@example.com" },
  ];

  for (const a of assignmentsData) {
    await prisma.evaluationAssignment.upsert({
      where: {
        fiscal_year_evaluatee_id_evaluator_id: {
          fiscal_year: a.fiscal_year,
          evaluatee_id: u[a.evaluatee].id,
          evaluator_id: u[a.evaluator].id,
        },
      },
      update: {},
      create: {
        fiscal_year: a.fiscal_year,
        evaluatee_id: u[a.evaluatee].id,
        evaluator_id: u[a.evaluator].id,
      },
    });
  }
  console.log(`evaluation_assignments: ${assignmentsData.length} upserted`);

  // =========================================================================
  // 4. 評価項目マスタ（evaluation_items）
  // =========================================================================
  for (const item of evaluationItemsData) {
    await prisma.evaluationItem.upsert({
      where: { uid: item.uid },
      update: {
        target: item.target,
        target_no: item.target_no,
        category: item.category,
        category_no: item.category_no,
        item_no: item.item_no,
        name: item.name,
        description: item.description ?? null,
        eval_criteria: item.eval_criteria ?? null,
        two_year_rule: item.two_year_rule,
      },
      create: {
        uid: item.uid,
        target: item.target,
        target_no: item.target_no,
        category: item.category,
        category_no: item.category_no,
        item_no: item.item_no,
        name: item.name,
        description: item.description ?? null,
        eval_criteria: item.eval_criteria ?? null,
        two_year_rule: item.two_year_rule,
      },
    });
  }
  console.log(`evaluation_items: ${evaluationItemsData.length} upserted`);

  // =========================================================================
  // 5. 年度マスタ（fiscal_years + fiscal_year_items）
  // =========================================================================
  const allItemUids = evaluationItemsData.map((item) => item.uid);
  await seedFiscalYears(allItemUids);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
