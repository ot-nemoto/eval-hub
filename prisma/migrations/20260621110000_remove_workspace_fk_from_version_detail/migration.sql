-- Remove FK constraints from eval_item_version_details to workspace tables
ALTER TABLE "eval_item_version_details" DROP CONSTRAINT IF EXISTS "eval_item_version_details_evaluation_item_id_fkey";
ALTER TABLE "eval_item_version_details" DROP CONSTRAINT IF EXISTS "eval_item_version_details_target_id_fkey";
ALTER TABLE "eval_item_version_details" DROP CONSTRAINT IF EXISTS "eval_item_version_details_category_id_fkey";
