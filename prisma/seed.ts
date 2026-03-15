import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import allocationsData from "./seeds/allocations.json";
import evaluationItemsData from "./seeds/evaluation_items.json";
import roleMappingsData from "./seeds/role_eval_mappings.json";
import rolesData from "./seeds/roles.json";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. evaluation_items
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

  // 2. roles
  for (const role of rolesData) {
    await prisma.role.upsert({
      where: { classification_name: { classification: role.classification, name: role.name } },
      update: {
        weight: role.weight,
        description: role.description ?? null,
        required_criteria: role.required_criteria ?? null,
        special_criteria: role.special_criteria ?? null,
      },
      create: {
        classification: role.classification,
        name: role.name,
        weight: role.weight,
        description: role.description ?? null,
        required_criteria: role.required_criteria ?? null,
        special_criteria: role.special_criteria ?? null,
      },
    });
  }
  console.log(`roles: ${rolesData.length} upserted`);

  // 3. role_eval_mappings（unique 制約なし → 全削除して再投入）
  await prisma.roleEvalMapping.deleteMany();
  for (const mapping of roleMappingsData) {
    const role = await prisma.role.findUnique({
      where: {
        classification_name: {
          classification: mapping.role_classification,
          name: mapping.role_name,
        },
      },
    });
    if (!role) {
      console.warn(`role not found: ${mapping.role_classification} / ${mapping.role_name}`);
      continue;
    }
    await prisma.roleEvalMapping.create({
      data: {
        role_id: role.id,
        eval_uid: mapping.eval_uid,
        necessity: mapping.necessity as "required" | "half",
        required_level: mapping.required_level as "none" | "ka" | "ryo" | "yu",
      },
    });
  }
  console.log(`role_eval_mappings: ${roleMappingsData.length} created`);

  // 4. allocations
  for (const alloc of allocationsData) {
    await prisma.allocation.upsert({
      where: {
        fiscal_year_division_eval_uid: {
          fiscal_year: alloc.fiscal_year,
          division: alloc.division,
          eval_uid: alloc.eval_uid,
        },
      },
      update: { weight: alloc.weight },
      create: {
        fiscal_year: alloc.fiscal_year,
        division: alloc.division,
        eval_uid: alloc.eval_uid,
        weight: alloc.weight,
      },
    });
  }
  console.log(`allocations: ${allocationsData.length} upserted`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
