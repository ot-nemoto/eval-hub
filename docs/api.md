> 最終更新: 2026-04-09 (T162: upsertManagerScoreAction 追加、addManagerCommentAction の score を optional 化)

# api.md — API 仕様

## 概要

Phase 8 の Server Actions 移行により、以下の操作は Server Actions に移行済みです（`docs/architecture.md` 参照）。

- 大分類・中分類マスタ（targets / categories）
- 評価項目マスタ（evaluation-items）
- 年度管理（fiscal-years）
- ユーザー管理（admin/users）
- 評価者アサイン管理（evaluation-assignments）
- 自己評価・評価者評価入力（evaluations）

本ドキュメントには **Server Actions の仕様** および **外部連携用途で残存する API Routes** を記載します。

---

## Server Actions

> 全 Action は認証必須。未認証の場合は `/login` にリダイレクトする。
> 管理系 Action（`createTargetAction` 等、`admin/` 配下）は ADMIN 権限必須で、権限不足時は `/evaluations` にリダイレクトする。

### Action 一覧

| Action | ファイル | 概要 | 認可 |
|--------|---------|------|------|
| `createTargetAction` | `src/app/(dashboard)/admin/targets/actions.ts` | 大分類作成 | ADMIN のみ |
| `updateTargetAction` | `src/app/(dashboard)/admin/targets/actions.ts` | 大分類更新 | ADMIN のみ |
| `deleteTargetAction` | `src/app/(dashboard)/admin/targets/actions.ts` | 大分類削除 | ADMIN のみ |
| `createCategoryAction` | `src/app/(dashboard)/admin/targets/actions.ts` | 中分類作成 | ADMIN のみ |
| `updateCategoryAction` | `src/app/(dashboard)/admin/targets/actions.ts` | 中分類更新 | ADMIN のみ |
| `deleteCategoryAction` | `src/app/(dashboard)/admin/targets/actions.ts` | 中分類削除 | ADMIN のみ |
| `createEvaluationItemAction` | `src/app/(dashboard)/admin/evaluation-items/actions.ts` | 評価項目作成 | ADMIN のみ |
| `updateEvaluationItemAction` | `src/app/(dashboard)/admin/evaluation-items/actions.ts` | 評価項目更新 | ADMIN のみ |
| `deleteEvaluationItemAction` | `src/app/(dashboard)/admin/evaluation-items/actions.ts` | 評価項目削除 | ADMIN のみ |
| `createFiscalYearAction` | `src/app/(dashboard)/admin/fiscal-years/actions.ts` | 年度作成 | ADMIN のみ |
| `updateFiscalYearAction` | `src/app/(dashboard)/admin/fiscal-years/actions.ts` | 年度更新 | ADMIN のみ |
| `deleteFiscalYearAction` | `src/app/(dashboard)/admin/fiscal-years/actions.ts` | 年度削除 | ADMIN のみ |
| `addFiscalYearItemAction` | `src/app/(dashboard)/admin/fiscal-years/actions.ts` | 年度に評価項目を追加 | ADMIN のみ |
| `removeFiscalYearItemAction` | `src/app/(dashboard)/admin/fiscal-years/actions.ts` | 年度から評価項目を除外 | ADMIN のみ |
| `updateUserAction` | `src/app/(dashboard)/admin/users/actions.ts` | ユーザー情報更新 | ADMIN のみ |
| `deleteUserAction` | `src/app/(dashboard)/admin/users/actions.ts` | ユーザー削除 | ADMIN のみ |
| `upsertEvaluationSettingAction` | `src/app/(dashboard)/admin/users/[id]/evaluation-settings/actions.ts` | 評価設定を登録・更新 | ADMIN のみ |
| `createEvaluationAssignmentAction` | `src/app/(dashboard)/admin/evaluation-assignments/actions.ts` | 評価者アサイン作成 | ADMIN のみ |
| `deleteEvaluationAssignmentAction` | `src/app/(dashboard)/admin/evaluation-assignments/actions.ts` | 評価者アサイン削除 | ADMIN のみ |
| `upsertSelfEvaluationAction` | `src/app/(dashboard)/evaluations/actions.ts` | 自己評価を登録・更新 | 要ログイン |
| `upsertManagerScoreAction` | `src/app/(dashboard)/members/actions.ts` | 最終評価スコアを登録・更新 | 要ログイン（アサイン済み評価者または ADMIN） |
| `addManagerCommentAction` | `src/app/(dashboard)/members/actions.ts` | 評価者コメントを追加 | 要ログイン（アサイン済み評価者または ADMIN） |
| `updateManagerCommentAction` | `src/app/(dashboard)/members/actions.ts` | 評価者コメントを更新 | コメント投稿者本人または ADMIN |
| `deleteManagerCommentAction` | `src/app/(dashboard)/members/actions.ts` | 評価者コメントを削除 | コメント投稿者本人または ADMIN |

---

## 大分類・中分類

### `createTargetAction`

**ファイル:** `src/app/(dashboard)/admin/targets/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `data.name` | `string` | YES | 空文字不可 |
| `data.no` | `number` | YES | 1 以上の整数 |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"name は必須です"` | name が空文字 |
| `"no は 1 以上の整数で指定してください"` | no が不正値 |
| `"同一の no が既に存在します"` | no 重複（ConflictError） |

---

### `updateTargetAction`

**ファイル:** `src/app/(dashboard)/admin/targets/actions.ts`

**引数**（`name` と `no` はいずれかが必須）

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `id` | `number` | YES | 1 以上の整数 |
| `data.name` | `string` | いずれか必須 | 空文字不可 |
| `data.no` | `number` | いずれか必須 | 1 以上の整数 |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"id は 1 以上の整数で指定してください"` | id が不正値 |
| `"name が不正です"` | name が空文字 |
| `"no は 1 以上の整数で指定してください"` | no が不正値 |
| `"更新可能なフィールドが指定されていません"` | name・no が両方 undefined |
| `"大分類が見つかりません"` | 指定 id が存在しない（NotFoundError） |
| `"同一の no が既に存在します"` | no 重複（ConflictError） |

---

### `deleteTargetAction`

**ファイル:** `src/app/(dashboard)/admin/targets/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `id` | `number` | YES | 1 以上の整数 |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"id は 1 以上の整数で指定してください"` | id が不正値 |
| `"大分類が見つかりません"` | 指定 id が存在しない（NotFoundError） |
| 紐づきデータに関するエラーメッセージ | 中分類・評価項目が存在する（ConflictError） |

---

### `createCategoryAction`

**ファイル:** `src/app/(dashboard)/admin/targets/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `data.targetId` | `number` | YES | 1 以上の整数 |
| `data.name` | `string` | YES | 空文字不可 |
| `data.no` | `number` | YES | 1 以上の整数 |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"targetId は 1 以上の整数で指定してください"` | targetId が不正値 |
| `"name は必須です"` | name が空文字 |
| `"no は 1 以上の整数で指定してください"` | no が不正値 |
| `"大分類が見つかりません"` | 指定 targetId が存在しない（NotFoundError） |
| 重複エラーメッセージ | 同一大分類内で no が重複（ConflictError） |

---

### `updateCategoryAction`

**ファイル:** `src/app/(dashboard)/admin/targets/actions.ts`

**引数**（`name` と `no` はいずれかが必須）

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `id` | `number` | YES | 1 以上の整数 |
| `data.name` | `string` | いずれか必須 | 空文字不可 |
| `data.no` | `number` | いずれか必須 | 1 以上の整数 |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"id は 1 以上の整数で指定してください"` | id が不正値 |
| `"name が不正です"` | name が空文字 |
| `"no は 1 以上の整数で指定してください"` | no が不正値 |
| `"更新可能なフィールドが指定されていません"` | name・no が両方 undefined |
| `"中分類が見つかりません"` | 指定 id が存在しない（NotFoundError） |
| 重複エラーメッセージ | 同一大分類内で no が重複（ConflictError） |

---

### `deleteCategoryAction`

**ファイル:** `src/app/(dashboard)/admin/targets/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `id` | `number` | YES | 1 以上の整数 |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"id は 1 以上の整数で指定してください"` | id が不正値 |
| `"中分類が見つかりません"` | 指定 id が存在しない（NotFoundError） |
| 紐づきデータに関するエラーメッセージ | 評価項目が存在する（ConflictError） |

---

## 評価項目

### `createEvaluationItemAction`

**ファイル:** `src/app/(dashboard)/admin/evaluation-items/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `data.targetId` | `number` | YES | 1 以上の整数 |
| `data.categoryId` | `number` | YES | 1 以上の整数 |
| `data.name` | `string` | YES | 空文字不可 |
| `data.description` | `string \| null` | NO | — |
| `data.evalCriteria` | `string \| null` | NO | — |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"targetId は 1 以上の整数で指定してください"` | targetId が不正値 |
| `"categoryId は 1 以上の整数で指定してください"` | categoryId が不正値 |
| `"name は必須です"` | name が空文字 |
| `"大分類が見つかりません"` / `"中分類が見つかりません"` | 指定 ID が存在しない（NotFoundError） |
| バリデーションエラーメッセージ | その他不正入力（BadRequestError） |

---

### `updateEvaluationItemAction`

**ファイル:** `src/app/(dashboard)/admin/evaluation-items/actions.ts`

**引数**（`name`・`description`・`evalCriteria` はいずれかが必須）

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `id` | `number` | YES | 1 以上の整数 |
| `data.name` | `string` | いずれか必須 | 空文字不可 |
| `data.description` | `string \| null` | いずれか必須 | — |
| `data.evalCriteria` | `string \| null` | いずれか必須 | — |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"id は 1 以上の整数で指定してください"` | id が不正値 |
| `"name は空にできません"` | name が空文字 |
| `"更新するフィールドを指定してください"` | 更新フィールドが全て undefined |
| `"評価項目が見つかりません"` | 指定 id が存在しない（NotFoundError） |

---

### `deleteEvaluationItemAction`

**ファイル:** `src/app/(dashboard)/admin/evaluation-items/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `id` | `number` | YES | 1 以上の整数 |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"id は 1 以上の整数で指定してください"` | id が不正値 |
| `"評価項目が見つかりません"` | 指定 id が存在しない（NotFoundError） |
| 紐づきデータに関するエラーメッセージ | 評価レコードが存在する（ConflictError） |

---

## 年度管理

### `createFiscalYearAction`

**ファイル:** `src/app/(dashboard)/admin/fiscal-years/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `data.year` | `number` | YES | 1900〜9999 の整数 |
| `data.name` | `string` | YES | 空文字不可 |
| `data.startDate` | `string` | YES | `YYYY-MM-DD` 形式 |
| `data.endDate` | `string` | YES | `YYYY-MM-DD` 形式 |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"year は 1900〜9999 の整数で指定してください"` | year が範囲外または非整数 |
| `"name は必須です"` | name が空文字 |
| `"startDate, endDate は必須です"` | 日付が未指定 |
| `"同一の年度がすでに存在します"` | year 重複（ConflictError） |
| バリデーションエラーメッセージ | 日付形式不正など（BadRequestError） |

---

### `updateFiscalYearAction`

**ファイル:** `src/app/(dashboard)/admin/fiscal-years/actions.ts`

**引数**（`name`・`startDate`・`endDate`・`isCurrent` はいずれかが必須）

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `year` | `number` | YES | 1900〜9999 の整数 |
| `data.name` | `string` | いずれか必須 | 空文字不可 |
| `data.startDate` | `string` | いずれか必須 | `YYYY-MM-DD` 形式 |
| `data.endDate` | `string` | いずれか必須 | `YYYY-MM-DD` 形式 |
| `data.isCurrent` | `boolean` | いずれか必須 | — |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"year は 1900〜9999 の整数で指定してください"` | year が範囲外または非整数 |
| `"更新するフィールドを指定してください"` | 更新フィールドが全て未指定 |
| `"年度が見つかりません"` | 指定 year が存在しない（NotFoundError） |
| バリデーションエラーメッセージ | 日付形式不正など（BadRequestError） |

---

### `deleteFiscalYearAction`

**ファイル:** `src/app/(dashboard)/admin/fiscal-years/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `year` | `number` | YES | 1900〜9999 の整数 |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"year は 1900〜9999 の整数で指定してください"` | year が範囲外または非整数 |
| `"年度が見つかりません"` | 指定 year が存在しない（NotFoundError） |
| 紐づきデータに関するエラーメッセージ | 評価レコードやアサインが存在する（ConflictError） |

---

### `addFiscalYearItemAction`

**ファイル:** `src/app/(dashboard)/admin/fiscal-years/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `year` | `number` | YES | 1900〜9999 の整数 |
| `itemId` | `number` | YES | 1 以上の整数 |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"year は 1900〜9999 の整数で指定してください"` | year が範囲外または非整数 |
| `"evaluationItemId は正の整数で指定してください"` | itemId が不正値 |
| `"年度が見つかりません"` / `"評価項目が見つかりません"` | 指定 ID が存在しない（NotFoundError） |
| 重複エラーメッセージ | 既に追加済み（ConflictError） |
| バリデーションエラーメッセージ | その他不正入力（BadRequestError） |

---

### `removeFiscalYearItemAction`

**ファイル:** `src/app/(dashboard)/admin/fiscal-years/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `year` | `number` | YES | 1900〜9999 の整数 |
| `itemId` | `number` | YES | 1 以上の整数 |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"year は 1900〜9999 の整数で指定してください"` | year が範囲外または非整数 |
| `"itemId は正の整数で指定してください"` | itemId が不正値 |
| `"年度が見つかりません"` / `"評価項目が見つかりません"` | 指定 ID が存在しない（NotFoundError） |
| バリデーションエラーメッセージ | その他不正入力（BadRequestError） |

---

## ユーザー管理

### `updateUserAction`

**ファイル:** `src/app/(dashboard)/admin/users/actions.ts`

**引数**（`role` と `isActive` はいずれかが必須）

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `id` | `string` | YES | ユーザー ID |
| `data.role` | `"ADMIN" \| "MEMBER"` | いずれか必須 | — |
| `data.isActive` | `boolean` | いずれか必須 | — |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"自分自身のロールは変更できません"` | 自分自身の操作（ForbiddenError） |
| `"ユーザーが見つかりません"` | 指定 id が存在しない（NotFoundError） |
| バリデーションエラーメッセージ | role・isActive が不正値（BadRequestError） |

---

### `deleteUserAction`

**ファイル:** `src/app/(dashboard)/admin/users/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `id` | `string` | YES | ユーザー ID |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"自分自身は削除できません"` | 自分自身の操作（ForbiddenError） |
| `"ユーザーが見つかりません"` | 指定 id が存在しない（NotFoundError） |
| `"評価データまたはアサインデータが存在するため削除できません"` | 紐づきデータあり（ConflictError） |

---

## 評価設定

### `upsertEvaluationSettingAction`

**ファイル:** `src/app/(dashboard)/admin/users/[id]/evaluation-settings/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `userId` | `string` | YES | ユーザー ID |
| `fiscalYear` | `number` | YES | 1900〜9999 の整数 |
| `data.selfEvaluationEnabled` | `boolean` | YES | — |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"fiscalYear は 1900〜9999 の整数で指定してください"` | fiscalYear が範囲外または非整数 |
| `"selfEvaluationEnabled は boolean で指定してください"` | selfEvaluationEnabled が不正値 |
| `"ユーザーが見つかりません"` | 指定 userId が存在しない（NotFoundError） |

---

## 評価者アサイン

### `createEvaluationAssignmentAction`

**ファイル:** `src/app/(dashboard)/admin/evaluation-assignments/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `data.fiscalYear` | `number` | YES | 1900〜9999 の整数 |
| `data.evaluateeId` | `string` | YES | ユーザー ID |
| `data.evaluatorId` | `string` | YES | ユーザー ID |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"fiscalYear は 1900〜9999 の整数で指定してください"` | fiscalYear が範囲外または非整数（BadRequestError） |
| `"evaluateeId は必須です"` | evaluateeId が空（BadRequestError） |
| `"evaluatorId は必須です"` | evaluatorId が空（BadRequestError） |
| `"同一年度・被評価者・評価者の組み合わせがすでに存在します"` | 重複（ConflictError） |

---

### `deleteEvaluationAssignmentAction`

**ファイル:** `src/app/(dashboard)/admin/evaluation-assignments/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `id` | `string` | YES | アサイン ID |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"アサインが見つかりません"` | 指定 id が存在しない（NotFoundError） |

---

## 自己評価

### `upsertSelfEvaluationAction`

**ファイル:** `src/app/(dashboard)/evaluations/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `fiscalYear` | `number` | YES | 1900〜9999 の整数 |
| `evalItemId` | `number` | YES | 1 以上の整数 |
| `data.selfScore` | `Score \| null` | NO | `"none" \| "ka" \| "ryo" \| "yu"` |
| `data.selfReason` | `string \| null` | NO | — |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"fiscalYear は 1900〜9999 の整数で指定してください"` | fiscalYear が範囲外または非整数 |
| `"evalItemId は正の整数で指定してください"` | evalItemId が不正値 |
| `"この年度は自己評価が不要に設定されています"` | 自己評価設定が無効 |
| バリデーションエラーメッセージ | その他不正入力（BadRequestError） |

---

## 評価者コメント

### `addManagerCommentAction`

**ファイル:** `src/app/(dashboard)/members/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `evaluateeId` | `string` | YES | ユーザー ID |
| `fiscalYear` | `number` | YES | 1900〜9999 の整数 |
| `evalItemId` | `number` | YES | 1 以上の整数 |
| `data.reason` | `string \| null` | NO | — |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"fiscalYear は 1900〜9999 の整数で指定してください"` | fiscalYear が範囲外または非整数 |
| `"evalItemId は正の整数で指定してください"` | evalItemId が不正値 |
| `"評価者としてアサインされていません"` | 評価者アサインが存在しない（ADMIN 以外） |
| バリデーションエラーメッセージ | その他不正入力（BadRequestError / ForbiddenError） |

---

### `upsertManagerScoreAction`

**ファイル:** `src/app/(dashboard)/members/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `evaluateeId` | `string` | YES | ユーザー ID |
| `fiscalYear` | `number` | YES | 1900〜9999 の整数 |
| `evalItemId` | `number` | YES | 1 以上の整数 |
| `managerScore` | `Score \| null` | YES | `"none" \| "ka" \| "ryo" \| "yu" \| null` |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"fiscalYear は 1900〜9999 の整数で指定してください"` | fiscalYear が範囲外または非整数 |
| `"evalItemId は正の整数で指定してください"` | evalItemId が不正値 |
| `"評価者としてアサインされていません"` | 評価者アサインが存在しない（ADMIN 以外） |

---

### `updateManagerCommentAction`

**ファイル:** `src/app/(dashboard)/members/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `commentId` | `string` | YES | コメント ID |
| `data.reason` | `string \| null` | NO | — |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"コメントが見つかりません"` | 指定 commentId が存在しない（NotFoundError） |
| `"このコメントを編集する権限がありません"` | 他者のコメント（ForbiddenError、ADMIN は除く） |
| バリデーションエラーメッセージ | score が不正値（BadRequestError） |

---

### `deleteManagerCommentAction`

**ファイル:** `src/app/(dashboard)/members/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `commentId` | `string` | YES | コメント ID |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"コメントが見つかりません"` | 指定 commentId が存在しない（NotFoundError） |
| `"このコメントを削除する権限がありません"` | 他者のコメント（ForbiddenError、ADMIN は除く） |

---

## 残存 API Routes

現時点で維持・提供する API Routes はありません。

コード上に残存しているルートはすべて削除対象（#182）です：

| パス | 状態 |
|---|---|
| `GET/POST /api/auth/[...nextauth]` | NextAuth スタブ（404 応答）— 削除対象 |
| `GET /api/members/:id/evaluation-settings` | 呼び出し元なし — 削除対象 |
| `PUT /api/members/:id/evaluation-settings/:year` | 呼び出し元なし — 削除対象 |

---

## v1.1 以降（defer）

以下のエンドポイントは v1.1 で追加予定。

| エンドポイント | 機能 |
|---|---|
| `GET/PUT /api/members/:id` | 社員プロフィール |
| `GET/PUT /api/members/:id/career-plans/:year` | キャリアプラン |
| `GET/POST/PUT/DELETE /api/goals` | 年度目標 |
| `GET /api/roles` | ロール一覧 |
| `GET /api/members/:id/roles/:year` | ロール認定状況 |
| `GET/PUT /api/allocations/:year` | 配点管理 |
| `GET/PUT /api/members/:id/records/:year` | 月次実績 |
