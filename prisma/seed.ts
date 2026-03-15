import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import evaluationItemsData from "./seeds/evaluation_items.json";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. users
  const password = await bcrypt.hash("password", 10);

  const tanaka = await prisma.user.upsert({
    where: { email: "tanaka@example.com" },
    update: { name: "田中太郎", role: "admin", password_hash: password },
    create: {
      email: "tanaka@example.com",
      name: "田中太郎",
      role: "admin",
      password_hash: password,
    },
  });

  const suzuki = await prisma.user.upsert({
    where: { email: "suzuki@example.com" },
    update: { name: "鈴木花子", role: "member", password_hash: password },
    create: {
      email: "suzuki@example.com",
      name: "鈴木花子",
      role: "member",
      password_hash: password,
    },
  });

  const sato = await prisma.user.upsert({
    where: { email: "sato@example.com" },
    update: { name: "佐藤健", role: "member", password_hash: password },
    create: {
      email: "sato@example.com",
      name: "佐藤健",
      role: "member",
      password_hash: password,
    },
  });

  console.log("users: 3 upserted");

  // 2. evaluation_assignments（2025年度）
  //   田中 → 評価者なし
  //   鈴木 → 評価者: 田中
  //   佐藤 → 評価者: 鈴木、田中
  const assignments = [
    { evaluatee_id: suzuki.id, evaluator_id: tanaka.id },
    { evaluatee_id: sato.id, evaluator_id: suzuki.id },
    { evaluatee_id: sato.id, evaluator_id: tanaka.id },
  ];

  for (const a of assignments) {
    await prisma.evaluationAssignment.upsert({
      where: {
        fiscal_year_evaluatee_id_evaluator_id: {
          fiscal_year: 2025,
          evaluatee_id: a.evaluatee_id,
          evaluator_id: a.evaluator_id,
        },
      },
      update: {},
      create: { fiscal_year: 2025, ...a },
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
