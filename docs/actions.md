# Server Actions

## Action 一覧

| Action | 概要 | ファイル |
|--------|------|---------|
| `setFiscalYearAction` | 表示年度をクッキーに設定 | `src/app/(dashboard)/actions.ts` |
| `updateNameAction` | ログインユーザーの表示名を更新 | `src/app/(dashboard)/actions.ts` |
| `createTargetAction` | 大分類作成 | `src/app/(dashboard)/admin/targets/actions.ts` |
| `updateTargetAction` | 大分類更新 | `src/app/(dashboard)/admin/targets/actions.ts` |
| `deleteTargetAction` | 大分類削除 | `src/app/(dashboard)/admin/targets/actions.ts` |
| `createCategoryAction` | 中分類作成 | `src/app/(dashboard)/admin/targets/actions.ts` |
| `updateCategoryAction` | 中分類更新 | `src/app/(dashboard)/admin/targets/actions.ts` |
| `deleteCategoryAction` | 中分類削除 | `src/app/(dashboard)/admin/targets/actions.ts` |
| `createEvaluationItemAction` | 評価項目作成 | `src/app/(dashboard)/admin/evaluation-items/actions.ts` |
| `updateEvaluationItemAction` | 評価項目更新 | `src/app/(dashboard)/admin/evaluation-items/actions.ts` |
| `deleteEvaluationItemAction` | 評価項目削除 | `src/app/(dashboard)/admin/evaluation-items/actions.ts` |
| `createFiscalYearAction` | 年度作成 | `src/app/(dashboard)/admin/fiscal-years/actions.ts` |
| `updateFiscalYearAction` | 年度更新 | `src/app/(dashboard)/admin/fiscal-years/actions.ts` |
| `toggleFiscalYearLockAction` | 年度のロック状態を切り替え | `src/app/(dashboard)/admin/fiscal-years/actions.ts` |
| `deleteFiscalYearAction` | 年度削除 | `src/app/(dashboard)/admin/fiscal-years/actions.ts` |
| `addFiscalYearItemAction` | 年度に評価項目を追加 | `src/app/(dashboard)/admin/fiscal-years/actions.ts` |
| `removeFiscalYearItemAction` | 年度から評価項目を除外 | `src/app/(dashboard)/admin/fiscal-years/actions.ts` |
| `updateUserAction` | ユーザー情報更新 | `src/app/(dashboard)/admin/users/actions.ts` |
| `deleteUserAction` | ユーザー削除 | `src/app/(dashboard)/admin/users/actions.ts` |
| `upsertEvaluationSettingAction` | 評価設定を登録・更新 | `src/app/(dashboard)/admin/users/[id]/evaluation-settings/actions.ts` |
| `createEvaluationAssignmentAction` | 評価者アサイン作成 | `src/app/(dashboard)/admin/evaluation-assignments/actions.ts` |
| `deleteEvaluationAssignmentAction` | 評価者アサイン削除 | `src/app/(dashboard)/admin/evaluation-assignments/actions.ts` |
| `upsertSelfEvaluationAction` | 自己評価を登録・更新 | `src/app/(dashboard)/evaluations/actions.ts` |
| `upsertManagerScoreAction` | 最終評価スコアを登録・更新 | `src/app/(dashboard)/members/actions.ts` |
| `addManagerCommentAction` | 評価者コメントを追加 | `src/app/(dashboard)/members/actions.ts` |
| `updateManagerCommentAction` | 評価者コメントを更新 | `src/app/(dashboard)/members/actions.ts` |
| `deleteManagerCommentAction` | 評価者コメントを削除 | `src/app/(dashboard)/members/actions.ts` |

---

## 共通仕様

- 全 Action は認証必須。先頭で `getSession()` を呼び出し、未認証は `redirect("/login")`
- 管理系 Action（`admin/` 配下）は ADMIN 権限必須。権限不足時は `redirect("/evaluations")`
- 戻り値は少なくとも `error?: string` を含む型にする
- DB 変更後は `revalidatePath()` でキャッシュを更新する
- `src/lib/` のカスタムエラーは catch して `{ error: message }` を返す。予期しないエラーは再 throw する

---

## 共通操作（`src/app/(dashboard)/actions.ts`）

### `setFiscalYearAction(year)`

表示年度をクッキーに設定する。

**引数:** `year: number`（2000〜2100 の整数）

**戻り値:** `{}` | `{ error: string }`

---

### `updateNameAction(name)`

ログインユーザーの表示名を更新する。

**引数:** `name: string`

**戻り値:** `{}` | `{ error: string }`

---

## 大分類・中分類（`src/app/(dashboard)/admin/targets/actions.ts`）

### `createTargetAction(data)`

大分類を作成する。

**引数:** `{ name: string; no: number }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"name は必須です"` | name が空文字 |
| `"no は 1 以上の整数で指定してください"` | no が不正値 |
| `"同一の no が既に存在します"` | no 重複（ConflictError） |

---

### `updateTargetAction(id, data)`

大分類を更新する。`name` と `no` はいずれかが必須。

**引数:** `id: number`, `{ name?: string; no?: number }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"id は 1 以上の整数で指定してください"` | id が不正値 |
| `"name が不正です"` | name が空文字 |
| `"no は 1 以上の整数で指定してください"` | no が不正値 |
| `"更新可能なフィールドが指定されていません"` | name・no が両方 undefined |
| `"大分類が見つかりません"` | 指定 id が存在しない（NotFoundError） |
| `"同一の no が既に存在します"` | no 重複（ConflictError） |

---

### `deleteTargetAction(id)`

大分類を削除する。

**引数:** `id: number`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"id は 1 以上の整数で指定してください"` | id が不正値 |
| `"大分類が見つかりません"` | 指定 id が存在しない（NotFoundError） |
| 紐づきデータに関するエラーメッセージ | 中分類・評価項目が存在する（ConflictError） |

---

### `createCategoryAction(data)`

中分類を作成する。

**引数:** `{ targetId: number; name: string; no: number }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"targetId は 1 以上の整数で指定してください"` | targetId が不正値 |
| `"name は必須です"` | name が空文字 |
| `"no は 1 以上の整数で指定してください"` | no が不正値 |
| `"大分類が見つかりません"` | 指定 targetId が存在しない（NotFoundError） |
| 重複エラーメッセージ | 同一大分類内で no が重複（ConflictError） |

---

### `updateCategoryAction(id, data)`

中分類を更新する。`name` と `no` はいずれかが必須。

**引数:** `id: number`, `{ name?: string; no?: number }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"id は 1 以上の整数で指定してください"` | id が不正値 |
| `"name が不正です"` | name が空文字 |
| `"no は 1 以上の整数で指定してください"` | no が不正値 |
| `"更新可能なフィールドが指定されていません"` | name・no が両方 undefined |
| `"中分類が見つかりません"` | 指定 id が存在しない（NotFoundError） |
| 重複エラーメッセージ | 同一大分類内で no が重複（ConflictError） |

---

### `deleteCategoryAction(id)`

中分類を削除する。

**引数:** `id: number`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"id は 1 以上の整数で指定してください"` | id が不正値 |
| `"中分類が見つかりません"` | 指定 id が存在しない（NotFoundError） |
| 紐づきデータに関するエラーメッセージ | 評価項目が存在する（ConflictError） |

---

## 評価項目（`src/app/(dashboard)/admin/evaluation-items/actions.ts`）

### `createEvaluationItemAction(data)`

評価項目を作成する。

**引数:** `{ targetId: number; categoryId: number; name: string; description?: string | null; evalCriteria?: string | null }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"targetId は 1 以上の整数で指定してください"` | targetId が不正値 |
| `"categoryId は 1 以上の整数で指定してください"` | categoryId が不正値 |
| `"name は必須です"` | name が空文字 |
| `"大分類が見つかりません"` / `"中分類が見つかりません"` | 指定 ID が存在しない（NotFoundError） |
| バリデーションエラーメッセージ | その他不正入力（BadRequestError） |

---

### `updateEvaluationItemAction(id, data)`

評価項目を更新する。`name`・`description`・`evalCriteria` はいずれかが必須。

**引数:** `id: number`, `{ name?: string; description?: string | null; evalCriteria?: string | null }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"id は 1 以上の整数で指定してください"` | id が不正値 |
| `"name は空にできません"` | name が空文字 |
| `"更新するフィールドを指定してください"` | 更新フィールドが全て undefined |
| `"評価項目が見つかりません"` | 指定 id が存在しない（NotFoundError） |

---

### `deleteEvaluationItemAction(id)`

評価項目を削除する。

**引数:** `id: number`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"id は 1 以上の整数で指定してください"` | id が不正値 |
| `"評価項目が見つかりません"` | 指定 id が存在しない（NotFoundError） |
| 紐づきデータに関するエラーメッセージ | 評価レコードが存在する（ConflictError） |

---

## 年度管理（`src/app/(dashboard)/admin/fiscal-years/actions.ts`）

### `createFiscalYearAction(data)`

年度を作成する。

**引数:** `{ year: number; name: string; startDate: string; endDate: string }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"year は 1900〜9999 の整数で指定してください"` | year が範囲外または非整数 |
| `"name は必須です"` | name が空文字 |
| `"startDate, endDate は必須です"` | 日付が未指定 |
| `"同一の年度がすでに存在します"` | year 重複（ConflictError） |
| バリデーションエラーメッセージ | 日付形式不正など（BadRequestError） |

---

### `updateFiscalYearAction(year, data)`

年度情報を更新する。`name`・`startDate`・`endDate`・`isCurrent` はいずれかが必須。

**引数:** `year: number`, `{ name?: string; startDate?: string; endDate?: string; isCurrent?: boolean }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"year は 1900〜9999 の整数で指定してください"` | year が範囲外または非整数 |
| `"更新するフィールドを指定してください"` | 更新フィールドが全て未指定 |
| `"年度が見つかりません"` | 指定 year が存在しない（NotFoundError） |
| バリデーションエラーメッセージ | 日付形式不正など（BadRequestError） |

---

### `toggleFiscalYearLockAction(year, isLocked)`

年度のロック状態を切り替える。

**引数:** `year: number`, `isLocked: boolean`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"year は 1900〜9999 の整数で指定してください"` | year が範囲外または非整数 |
| `"年度が見つかりません"` | 指定 year が存在しない（NotFoundError） |

---

### `deleteFiscalYearAction(year)`

年度を削除する。

**引数:** `year: number`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"year は 1900〜9999 の整数で指定してください"` | year が範囲外または非整数 |
| `"年度が見つかりません"` | 指定 year が存在しない（NotFoundError） |
| 紐づきデータに関するエラーメッセージ | 評価レコードやアサインが存在する（ConflictError） |

---

### `addFiscalYearItemAction(year, itemId)`

年度に評価項目を追加する。

**引数:** `year: number`, `itemId: number`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"year は 1900〜9999 の整数で指定してください"` | year が範囲外または非整数 |
| `"evaluationItemId は正の整数で指定してください"` | itemId が不正値 |
| `"年度が見つかりません"` / `"評価項目が見つかりません"` | 指定 ID が存在しない（NotFoundError） |
| 重複エラーメッセージ | 既に追加済み（ConflictError） |
| バリデーションエラーメッセージ | その他不正入力（BadRequestError） |

---

### `removeFiscalYearItemAction(year, itemId)`

年度から評価項目を除外する。

**引数:** `year: number`, `itemId: number`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"year は 1900〜9999 の整数で指定してください"` | year が範囲外または非整数 |
| `"itemId は正の整数で指定してください"` | itemId が不正値 |
| `"年度が見つかりません"` / `"評価項目が見つかりません"` | 指定 ID が存在しない（NotFoundError） |
| バリデーションエラーメッセージ | その他不正入力（BadRequestError） |

---

## ユーザー管理（`src/app/(dashboard)/admin/users/actions.ts`）

### `updateUserAction(id, data)`

ユーザーのロール・有効状態を更新する。`role` と `isActive` はいずれかが必須。

**引数:** `id: string`, `{ role?: "ADMIN" | "MEMBER"; isActive?: boolean }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"自分自身のロールは変更できません"` | 自分自身の操作（ForbiddenError） |
| `"ユーザーが見つかりません"` | 指定 id が存在しない（NotFoundError） |
| バリデーションエラーメッセージ | role・isActive が不正値（BadRequestError） |

---

### `deleteUserAction(id)`

ユーザーを削除する。自分自身は削除不可。

**引数:** `id: string`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"自分自身は削除できません"` | 自分自身の操作（ForbiddenError） |
| `"ユーザーが見つかりません"` | 指定 id が存在しない（NotFoundError） |
| `"評価データまたはアサインデータが存在するため削除できません"` | 紐づきデータあり（ConflictError） |

---

## 評価設定（`src/app/(dashboard)/admin/users/[id]/evaluation-settings/actions.ts`）

### `upsertEvaluationSettingAction(userId, fiscalYear, data)`

ユーザーの年度別評価設定を作成または更新する。

**引数:** `userId: string`, `fiscalYear: number`, `{ selfEvaluationEnabled: boolean }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"fiscalYear は 1900〜9999 の整数で指定してください"` | fiscalYear が範囲外または非整数 |
| `"selfEvaluationEnabled は boolean で指定してください"` | selfEvaluationEnabled が不正値 |
| `"ユーザーが見つかりません"` | 指定 userId が存在しない（NotFoundError） |

---

## 評価者アサイン（`src/app/(dashboard)/admin/evaluation-assignments/actions.ts`）

### `createEvaluationAssignmentAction(data)`

評価者アサインを作成する。

**引数:** `{ fiscalYear: number; evaluateeId: string; evaluatorId: string }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"fiscalYear は 1900〜9999 の整数で指定してください"` | fiscalYear が範囲外または非整数 |
| `"evaluateeId は必須です"` | evaluateeId が空（BadRequestError） |
| `"evaluatorId は必須です"` | evaluatorId が空（BadRequestError） |
| `"同一年度・被評価者・評価者の組み合わせがすでに存在します"` | 重複（ConflictError） |

---

### `deleteEvaluationAssignmentAction(id)`

評価者アサインを削除する。

**引数:** `id: string`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"アサインが見つかりません"` | 指定 id が存在しない（NotFoundError） |

---

## 自己評価（`src/app/(dashboard)/evaluations/actions.ts`）

### `upsertSelfEvaluationAction(fiscalYear, evalItemId, data)`

ログインユーザーの自己評価スコア・理由を登録または更新する。年度ロック中・自己評価無効設定の場合はエラー。

**引数:** `fiscalYear: number`, `evalItemId: number`, `{ selfScore?: Score | null; selfReason?: string | null }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"fiscalYear は 1900〜9999 の整数で指定してください"` | fiscalYear が範囲外または非整数 |
| `"evalItemId は正の整数で指定してください"` | evalItemId が不正値 |
| `"この年度は自己評価が不要に設定されています"` | 自己評価設定が無効 |
| バリデーションエラーメッセージ | その他不正入力（BadRequestError） |

---

## 評価者スコア・コメント（`src/app/(dashboard)/members/actions.ts`）

### `upsertManagerScoreAction(evaluateeId, fiscalYear, evalItemId, managerScore)`

評価スコアを登録または更新する。評価者アサインされていない MEMBER はエラー。

**引数:** `evaluateeId: string`, `fiscalYear: number`, `evalItemId: number`, `managerScore: Score | null`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"fiscalYear は 1900〜9999 の整数で指定してください"` | fiscalYear が範囲外または非整数 |
| `"evalItemId は正の整数で指定してください"` | evalItemId が不正値 |
| `"評価者としてアサインされていません"` | 評価者アサインが存在しない（ADMIN 以外） |

---

### `addManagerCommentAction(evaluateeId, fiscalYear, evalItemId, data)`

評価コメントを追加する。成功時は作成したコメントを返す。

**引数:** `evaluateeId: string`, `fiscalYear: number`, `evalItemId: number`, `{ reason: string | null }`

**戻り値:** `{ comment: ManagerCommentPayload }` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"fiscalYear は 1900〜9999 の整数で指定してください"` | fiscalYear が範囲外または非整数 |
| `"evalItemId は正の整数で指定してください"` | evalItemId が不正値 |
| `"評価者としてアサインされていません"` | 評価者アサインが存在しない（ADMIN 以外） |
| バリデーションエラーメッセージ | その他不正入力（BadRequestError / ForbiddenError） |

---

### `updateManagerCommentAction(commentId, evaluateeId, data)`

評価コメントを更新する。成功時は更新後のコメントを返す。

**引数:** `commentId: string`, `evaluateeId: string`, `{ reason?: string | null }`

**戻り値:** `{ comment: ManagerCommentPayload }` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"コメントが見つかりません"` | 指定 commentId が存在しない（NotFoundError） |
| `"自分のコメントのみ編集できます"` | 他者のコメント（ForbiddenError、ADMIN は除く） |

---

### `deleteManagerCommentAction(commentId, evaluateeId)`

評価コメントを削除する。

**引数:** `commentId: string`, `evaluateeId: string`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"コメントが見つかりません"` | 指定 commentId が存在しない（NotFoundError） |
| `"自分のコメントのみ削除できます"` | 他者のコメント（ForbiddenError、ADMIN は除く） |

---

## 型定義

### `ManagerCommentPayload`

```ts
type ManagerCommentPayload = {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  reason: string | null;
  createdAt: Date;
};
```

### `Score`

```ts
type Score = "none" | "ka" | "ryo" | "yu";
```
