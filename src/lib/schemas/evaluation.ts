import { z } from "zod";
import { fiscalYearField, nonEmptyIdField, positiveIntField } from "@/lib/schemas/common";

/** 採点スコア。 */
export const scoreSchema = z.enum(["none", "ka", "ryo", "yu"]);

const evalItemVersionDetailIdField = positiveIntField("evalItemVersionDetailId");

// ─── 書き込み body ───────────────────────────────────────────────

/** 自己採点 upsert body。 */
export const evaluationSelfUpsertBodySchema = z.object(
  {
    fiscalYear: fiscalYearField,
    evaluateeId: nonEmptyIdField("evaluateeId"),
    evalItemVersionDetailId: evalItemVersionDetailIdField,
    selfScore: scoreSchema.nullish(),
    selfReason: z.string().nullish(),
  },
  { error: "リクエストボディが不正です" },
);

/** 上長スコア upsert body。 */
export const evaluationManagerScoreBodySchema = z.object(
  {
    fiscalYear: fiscalYearField,
    evaluateeId: nonEmptyIdField("evaluateeId"),
    evalItemVersionDetailId: evalItemVersionDetailIdField,
    managerScore: scoreSchema.nullable(),
  },
  { error: "リクエストボディが不正です" },
);

/** 評価者コメント作成 body。 */
export const evaluationCommentCreateBodySchema = z.object(
  {
    fiscalYear: fiscalYearField,
    evaluateeId: nonEmptyIdField("evaluateeId"),
    evalItemVersionDetailId: evalItemVersionDetailIdField,
    evaluatorId: nonEmptyIdField("evaluatorId"),
    reason: z.string().nullable(),
  },
  { error: "リクエストボディが不正です" },
);

/** 評価者コメント更新 body。 */
export const evaluationCommentUpdateBodySchema = z.object(
  { reason: z.string().nullable() },
  { error: "リクエストボディが不正です" },
);

// ─── レスポンス（OpenAPI 用。日付は JSON 化で ISO 文字列になる）─────

const userRef = z.object({ id: z.string(), name: z.string() });
const itemRef = z.object({ uid: z.string(), name: z.string() });

/** 自己採点 upsert のレスポンス。 */
export const evaluationSelfUpsertResponseSchema = z.object({
  evalItemVersionDetailId: z.number().int(),
  selfScore: scoreSchema.nullable(),
  selfReason: z.string().nullable(),
});

/** 上長スコア upsert のレスポンス。 */
export const evaluationManagerScoreResponseSchema = z.object({
  evalItemVersionDetailId: z.number().int(),
  managerScore: scoreSchema.nullable(),
});

/** 評価者コメント（作成・更新）のレスポンス。 */
export const managerCommentResponseSchema = z.object({
  id: z.string(),
  evaluationId: z.string(),
  evaluatorId: z.string(),
  score: scoreSchema.nullable(),
  reason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** 被評価者の項目別評価詳細（GET /api/evaluations）。 */
export const evaluationDetailResponseSchema = z.object({
  evaluations: z.array(
    z.object({
      evalItemVersionDetailId: z.number().int(),
      evaluationId: z.string(),
      itemName: z.string(),
      selfScore: scoreSchema.nullable(),
      selfReason: z.string().nullable(),
      managerScore: scoreSchema.nullable(),
      managerComments: z.array(
        z.object({
          id: z.string(),
          evaluatorId: z.string(),
          evaluatorName: z.string(),
          reason: z.string().nullable(),
          createdAt: z.string(),
        }),
      ),
    }),
  ),
});

/** 評価マトリクス（GET /api/evaluations/matrix）。 */
export const evaluationMatrixResponseSchema = z.object({
  users: z.array(userRef),
  rows: z.array(
    z.object({
      uid: z.string(),
      name: z.string(),
      scores: z.array(
        z.object({ selfScore: scoreSchema.nullable(), managerScore: scoreSchema.nullable() }),
      ),
    }),
  ),
});

/** 評価進捗（GET /api/evaluations/progress）。 */
export const evaluationProgressResponseSchema = z.object({
  progress: z.array(
    z.object({
      evaluateeId: z.string(),
      name: z.string(),
      totalItems: z.number().int(),
      selfScored: z.number().int(),
      managerScored: z.number().int(),
      lastUpdatedAt: z.string().nullable(),
    }),
  ),
});

/** 自己評価一覧（GET /api/evaluations/self）。 */
export const selfEvaluationListResponseSchema = z.object({
  selfEvaluations: z.array(
    z.object({
      id: z.string(),
      evaluatee: userRef,
      item: itemRef,
      selfScore: scoreSchema.nullable(),
      selfReason: z.string().nullable(),
      updatedAt: z.string(),
    }),
  ),
});

/** 上長評価一覧（GET /api/evaluations/manager）。 */
export const managerEvaluationListResponseSchema = z.object({
  managerEvaluations: z.array(
    z.object({
      id: z.string(),
      evaluatee: userRef,
      item: itemRef,
      managerScore: scoreSchema.nullable(),
      latestComment: z
        .object({ reason: z.string().nullable(), evaluatorName: z.string() })
        .nullable(),
      updatedAt: z.string(),
    }),
  ),
});
