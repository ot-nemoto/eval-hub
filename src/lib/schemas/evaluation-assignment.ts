import { z } from "zod";
import { fiscalYearField, nonEmptyIdField } from "@/lib/schemas/common";

/**
 * 評価者アサインの作成 body。年度・被評価者・評価者を指定。
 * 重複(409) は lib（`createEvaluationAssignment`）が担保する。
 */
export const evaluationAssignmentCreateBodySchema = z.object(
  {
    fiscalYear: fiscalYearField,
    evaluateeId: nonEmptyIdField("evaluateeId"),
    evaluatorId: nonEmptyIdField("evaluatorId"),
  },
  { error: "リクエストボディが不正です" },
);

const userRef = z.object({ id: z.string(), name: z.string() });

/** アサインのレスポンス（GET 一覧・評価者/被評価者の名前をネスト）。 */
export const evaluationAssignmentResponseSchema = z.object({
  id: z.string(),
  fiscalYear: z.number().int(),
  evaluatee: userRef,
  evaluator: userRef,
});

/** 作成レスポンス（flat・lib の create 返却形）。 */
export const evaluationAssignmentCreatedSchema = z.object({
  id: z.string(),
  fiscalYear: z.number().int(),
  evaluateeId: z.string(),
  evaluatorId: z.string(),
});

/** GET /api/evaluation-assignments のレスポンス（一覧ラッパ）。 */
export const evaluationAssignmentListResponseSchema = z.object({
  evaluationAssignments: z.array(evaluationAssignmentResponseSchema),
});
