import { createClerkClient } from "@clerk/backend";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import evaluationItemsData from "./seeds/evaluation_items.json";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

async function syncClerkUser(email: string): Promise<string | null> {
  if (!clerkClient) {
    console.warn("  CLERK_SECRET_KEY が未設定のため Clerk ユーザー作成をスキップします");
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

async function main() {
  // 1. users
  const usersData = [
    { email: "tanaka@example.com", name: "田中太郎", role: "admin" as const },
    { email: "suzuki@example.com", name: "鈴木花子", role: "member" as const },
    { email: "sato@example.com", name: "佐藤健", role: "member" as const },
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

  console.log("users: 3 upserted");

  // 2. evaluation_assignments（2026年度）
  const assignments = [
    { evaluatee_id: createdUsers["suzuki@example.com"].id, evaluator_id: createdUsers["tanaka@example.com"].id },
    { evaluatee_id: createdUsers["sato@example.com"].id, evaluator_id: createdUsers["suzuki@example.com"].id },
    { evaluatee_id: createdUsers["sato@example.com"].id, evaluator_id: createdUsers["tanaka@example.com"].id },
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
