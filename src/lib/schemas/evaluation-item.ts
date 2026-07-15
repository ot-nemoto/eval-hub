import { z } from "zod";

/**
 * 評価項目一括インポート（POST /api/evaluation-items）の body スキーマ。
 * 大項目（Target）→ 中項目（Category）→ 評価項目（EvaluationItem）の階層構造。
 * route の責務は「型・構造の検証」のみ。no≥1・name 非空・no 重複(409) の判定は
 * lib（`bulkReplaceEvaluationItems`）が担う。
 */
// 未指定（undefined）と型不一致で文言を分ける（両方「必須」だと誤解を招くため）。
const noField = z
  .number({
    error: (iss) => (iss.input === undefined ? "no は必須です" : "no は数値で指定してください"),
  })
  .int({ error: "no は整数で指定してください" });

const importItemSchema = z.object({
  no: noField,
  name: z.string({ error: "name は必須です" }),
  description: z.string().nullish(),
  evalCriteria: z.string().nullish(),
});

const importCategorySchema = z.object({
  no: noField,
  name: z.string({ error: "name は必須です" }),
  items: z.array(importItemSchema, { error: "items は配列で指定してください" }),
});

const importTargetSchema = z.object({
  no: noField,
  name: z.string({ error: "name は必須です" }),
  categories: z.array(importCategorySchema, { error: "categories は配列で指定してください" }),
});

export const evaluationItemsImportBodySchema = z
  .array(importTargetSchema, { error: "大項目の配列を指定してください" })
  .min(1, { error: "大項目の配列を指定してください" })
  .meta({ description: "大項目→中項目→評価項目の階層構造。index は送信順に自動採番される。" });

/** 一括インポートのレスポンス（作成件数）。 */
export const evaluationItemsImportResponseSchema = z.object({
  created: z.number().int(),
});

/** 評価項目のレスポンス形式（GET 一覧）。 */
export const evaluationItemResponseSchema = z.object({
  id: z.number().int(),
  no: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  evalCriteria: z.string().nullable(),
  target: z.object({ id: z.number().int(), no: z.number().int(), name: z.string() }),
  category: z.object({ id: z.number().int(), no: z.number().int(), name: z.string() }),
});

/** GET /api/evaluation-items のレスポンス（一覧ラッパ）。 */
export const evaluationItemListResponseSchema = z.object({
  evaluationItems: z.array(evaluationItemResponseSchema),
});
