import { z } from "zod";
import { fiscalYearField, nonEmptyIdField } from "@/lib/schemas/common";

/**
 * 自己評価要否設定の upsert body。(userId, fiscalYear) をキーに作成/更新する。
 */
export const evaluationSettingUpsertBodySchema = z.object(
  {
    userId: nonEmptyIdField("userId"),
    fiscalYear: fiscalYearField,
    selfEvaluationEnabled: z.boolean({ error: "selfEvaluationEnabled は真偽値で指定してください" }),
  },
  { error: "リクエストボディが不正です" },
);

/** 設定のレスポンス形式。 */
export const evaluationSettingResponseSchema = z.object({
  fiscalYear: z.number().int(),
  selfEvaluationEnabled: z.boolean(),
});

/** GET /api/evaluation-settings のレスポンス（一覧ラッパ）。 */
export const evaluationSettingListResponseSchema = z.object({
  evaluationSettings: z.array(evaluationSettingResponseSchema),
});
