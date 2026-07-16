import { z } from "zod";
import { nameField, positiveIntField } from "@/lib/schemas/common";

/** バージョン作成 body。現在のマスタからスナップショットを作る。 */
export const evalItemVersionCreateBodySchema = z.object(
  { name: nameField },
  { error: "リクエストボディが不正です" },
);

/** 年度へのバージョン割当 body。 */
export const versionAssignBodySchema = z.object(
  { versionId: positiveIntField("versionId") },
  { error: "リクエストボディが不正です" },
);

/** バージョンのレスポンス（一覧・件数付き）。 */
export const evalItemVersionResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  createdAt: z.string(),
  detailsCount: z.number().int(),
  fiscalYearsCount: z.number().int(),
});

/** GET /api/eval-item-versions のレスポンス（一覧ラッパ）。 */
export const evalItemVersionListResponseSchema = z.object({
  evalItemVersions: z.array(evalItemVersionResponseSchema),
});

/** バージョン詳細 1 件のスナップショット。 */
const versionDetailSchema = z.object({
  id: z.number().int(),
  evaluationItemId: z.number().int().nullable(),
  targetId: z.number().int(),
  categoryId: z.number().int(),
  no: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  evalCriteria: z.string().nullable(),
  index: z.number().int(),
  targetNo: z.number().int(),
  targetName: z.string(),
  targetIndex: z.number().int(),
  categoryNo: z.number().int(),
  categoryName: z.string(),
  categoryIndex: z.number().int(),
});

/** GET /api/eval-item-versions/{id} のレスポンス。 */
export const evalItemVersionDetailResponseSchema = z.object({
  version: z.object({ id: z.number().int(), name: z.string(), createdAt: z.string() }),
  details: z.array(versionDetailSchema),
});

/** 作成レスポンス。 */
export const evalItemVersionCreatedSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  createdAt: z.string(),
});

/** 現在のマスタスナップショット（GET /api/eval-item-versions/current）。 */
export const currentEvalItemsResponseSchema = z.object({
  currentEvalItems: z.array(
    z.object({
      evaluationItemId: z.number().int(),
      targetId: z.number().int(),
      categoryId: z.number().int(),
      no: z.number().int(),
      name: z.string(),
      description: z.string().nullable(),
      evalCriteria: z.string().nullable(),
      index: z.number().int(),
      targetNo: z.number().int(),
      targetName: z.string(),
      targetIndex: z.number().int(),
      categoryNo: z.number().int(),
      categoryName: z.string(),
      categoryIndex: z.number().int(),
    }),
  ),
});

/** 年度割当のレスポンス。 */
export const versionAssignResultSchema = z.object({
  year: z.number().int(),
  evalItemVersionId: z.number().int().nullable(),
});
