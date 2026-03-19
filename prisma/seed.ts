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

async function syncClerkUser(email: string): Promise<string | null> {
  if (!clerkClient) {
    if (process.env.NODE_ENV === "production") {
      console.warn("  本番環境のため Clerk ユーザー作成をスキップします");
    } else {
      console.warn("  CLERK_SECRET_KEY が未設定のため Clerk ユーザー作成をスキップします");
    }
    return null;
  }

  // 既存の Clerk ユーザーを検索
  const existing = await clerkClient.users.getUserList({ emailAddress: [email] });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  // 新規作成
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

async function main() {
  // 0. 旧 seed ユーザーのクリーンアップ
  const oldEmails = ["tanaka@example.com", "suzuki@example.com", "sato@example.com"];
  for (const email of oldEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.evaluationAssignment.deleteMany({
        where: { OR: [{ evaluatee_id: user.id }, { evaluator_id: user.id }] },
      });
      await prisma.evaluation.deleteMany({ where: { evaluatee_id: user.id } });
      await prisma.user.delete({ where: { email } });
      await deleteClerkUser(email);
      console.log(`  deleted old user: ${email}`);
    }
  }

  // 1. users
  //
  // ユーザー構成（ドカベン）:
  //   土井垣将  - admin / 評価アサインなし
  //   不知火守  - admin / 山田太郎・里中智を評価
  //   山田太郎  - member / 里中智を評価、不知火守に評価される（評価者かつ被評価者）
  //   里中智    - member / 不知火守・山田太郎の2名から評価される（複数評価者）
  //   岩鬼正美  - member / 評価者アサインなし
  const usersData = [
    { email: "doigaki@example.com", name: "土井垣将", role: "admin" as const },
    { email: "shiranui@example.com", name: "不知火守", role: "admin" as const },
    { email: "yamada@example.com", name: "山田太郎", role: "member" as const },
    { email: "satonaka@example.com", name: "里中智", role: "member" as const },
    { email: "iwaki@example.com", name: "岩鬼正美", role: "member" as const },
  ];

  const createdUsers: Record<string, { id: string }> = {};

  for (const u of usersData) {
    const clerkId = await syncClerkUser(u.email);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, ...(clerkId ? { clerk_id: clerkId } : {}) },
      create: { email: u.email, name: u.name, role: u.role, ...(clerkId ? { clerk_id: clerkId } : {}) },
    });
    createdUsers[u.email] = user;
  }

  console.log("users: 5 upserted");

  // 2. evaluation_assignments（2026年度）
  //   不知火守 → 山田太郎を評価
  //   不知火守 → 里中智を評価
  //   山田太郎 → 里中智を評価
  const assignments = [
    {
      evaluatee_id: createdUsers["yamada@example.com"].id,
      evaluator_id: createdUsers["shiranui@example.com"].id,
    },
    {
      evaluatee_id: createdUsers["satonaka@example.com"].id,
      evaluator_id: createdUsers["shiranui@example.com"].id,
    },
    {
      evaluatee_id: createdUsers["satonaka@example.com"].id,
      evaluator_id: createdUsers["yamada@example.com"].id,
    },
  ];

  for (const a of assignments) {
    await prisma.evaluationAssignment.upsert({
      where: {
        fiscal_year_evaluatee_id_evaluator_id: {
          fiscal_year: 2026,
          evaluatee_id: a.evaluatee_id,
          evaluator_id: a.evaluator_id,
        },
      },
      update: {},
      create: { fiscal_year: 2026, ...a },
    });
  }
  console.log("evaluation_assignments: 3 upserted");

  // 3. evaluation_items
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
