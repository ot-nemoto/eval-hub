# Server Actions 定義

## 共通仕様

| 項目 | 仕様 |
|------|------|
| ディレクティブ | 各ファイル先頭に `"use server"` |
| 認証チェック | 各 Action 先頭で `getSession()` を呼び出し、未認証は `redirect("/login")` |
| ADMIN 専用操作 | `session.user.role !== "ADMIN"` の場合は `redirect("/evaluations")` |
| 戻り値 | `Promise<{ error?: string }>` を基本とし、成功時に追加フィールドを返す場合あり |
| エラーハンドリング | `src/lib/` のカスタムエラーは catch して `{ error: message }` を返す。予期しないエラーは再 throw |
| キャッシュ更新 | DB 変更後は `revalidatePath()` でキャッシュを更新する |

---

## Action 一覧

### `src/app/(dashboard)/actions.ts`

| Action | 引数 | 戻り値 | 認可 | 説明 |
|--------|------|--------|------|------|
| `setFiscalYearAction` | `year: number` | `{ error?: string }` | MEMBER / ADMIN | 表示年度をクッキーに設定する |
| `updateNameAction` | `name: string` | `{ error?: string }` | MEMBER / ADMIN | ログインユーザーの表示名を更新する |

---

### `src/app/(dashboard)/admin/targets/actions.ts`

| Action | 引数 | 戻り値 | 認可 | 説明 |
|--------|------|--------|------|------|
| `createTargetAction` | `{ name: string; no: number }` | `{ error?: string }` | ADMIN | 大分類を作成する |
| `updateTargetAction` | `id: number`, `{ name?: string; no?: number }` | `{ error?: string }` | ADMIN | 大分類を更新する |
| `deleteTargetAction` | `id: number` | `{ error?: string }` | ADMIN | 大分類を削除する |
| `createCategoryAction` | `{ targetId: number; name: string; no: number }` | `{ error?: string }` | ADMIN | 中分類を作成する |
| `updateCategoryAction` | `id: number`, `{ name?: string; no?: number }` | `{ error?: string }` | ADMIN | 中分類を更新する |
| `deleteCategoryAction` | `id: number` | `{ error?: string }` | ADMIN | 中分類を削除する |

---

### `src/app/(dashboard)/admin/evaluation-items/actions.ts`

| Action | 引数 | 戻り値 | 認可 | 説明 |
|--------|------|--------|------|------|
| `createEvaluationItemAction` | `{ targetId: number; categoryId: number; name: string; description?: string \| null; evalCriteria?: string \| null }` | `{ error?: string }` | ADMIN | 評価項目を作成する |
| `updateEvaluationItemAction` | `id: number`, `{ name?: string; description?: string \| null; evalCriteria?: string \| null }` | `{ error?: string }` | ADMIN | 評価項目を更新する |
| `deleteEvaluationItemAction` | `id: number` | `{ error?: string }` | ADMIN | 評価項目を削除する |

---

### `src/app/(dashboard)/admin/users/actions.ts`

| Action | 引数 | 戻り値 | 認可 | 説明 |
|--------|------|--------|------|------|
| `updateUserAction` | `id: string`, `{ role?: "ADMIN" \| "MEMBER"; isActive?: boolean }` | `{ error?: string }` | ADMIN | ユーザーのロール・有効状態を更新する |
| `deleteUserAction` | `id: string` | `{ error?: string }` | ADMIN | ユーザーを削除する（自分自身は不可） |

---

### `src/app/(dashboard)/admin/users/[id]/evaluation-settings/actions.ts`

| Action | 引数 | 戻り値 | 認可 | 説明 |
|--------|------|--------|------|------|
| `upsertEvaluationSettingAction` | `userId: string`, `fiscalYear: number`, `{ selfEvaluationEnabled: boolean }` | `{ error?: string }` | ADMIN | ユーザーの年度別評価設定を作成または更新する |

---

### `src/app/(dashboard)/admin/evaluation-assignments/actions.ts`

| Action | 引数 | 戻り値 | 認可 | 説明 |
|--------|------|--------|------|------|
| `createEvaluationAssignmentAction` | `{ fiscalYear: number; evaluateeId: string; evaluatorId: string }` | `{ error?: string }` | ADMIN | 評価者アサインを作成する |
| `deleteEvaluationAssignmentAction` | `id: string` | `{ error?: string }` | ADMIN | 評価者アサインを削除する |

---

### `src/app/(dashboard)/admin/fiscal-years/actions.ts`

| Action | 引数 | 戻り値 | 認可 | 説明 |
|--------|------|--------|------|------|
| `createFiscalYearAction` | `{ year: number; name: string; startDate: string; endDate: string }` | `{ error?: string }` | ADMIN | 年度を作成する |
| `updateFiscalYearAction` | `year: number`, `{ name?: string; startDate?: string; endDate?: string; isCurrent?: boolean }` | `{ error?: string }` | ADMIN | 年度情報を更新する |
| `toggleFiscalYearLockAction` | `year: number`, `isLocked: boolean` | `{ error?: string }` | ADMIN | 年度のロック状態を切り替える |
| `deleteFiscalYearAction` | `year: number` | `{ error?: string }` | ADMIN | 年度を削除する |
| `addFiscalYearItemAction` | `year: number`, `itemId: number` | `{ error?: string }` | ADMIN | 年度に評価項目を追加する |
| `removeFiscalYearItemAction` | `year: number`, `itemId: number` | `{ error?: string }` | ADMIN | 年度から評価項目を除外する |

---

### `src/app/(dashboard)/evaluations/actions.ts`

| Action | 引数 | 戻り値 | 認可 | 説明 |
|--------|------|--------|------|------|
| `upsertSelfEvaluationAction` | `fiscalYear: number`, `evalItemId: number`, `{ selfScore?: Score \| null; selfReason?: string \| null }` | `{ error?: string }` | MEMBER / ADMIN | ログインユーザーの自己評価スコア・理由を更新する。年度ロック中・自己評価無効設定の場合はエラー |

---

### `src/app/(dashboard)/members/actions.ts`

| Action | 引数 | 戻り値 | 認可 | 説明 |
|--------|------|--------|------|------|
| `upsertManagerScoreAction` | `evaluateeId: string`, `fiscalYear: number`, `evalItemId: number`, `managerScore: Score \| null` | `{ error?: string }` | 評価者 / ADMIN | 評価スコアを更新する。評価者アサインされていない MEMBER はエラー |
| `addManagerCommentAction` | `evaluateeId: string`, `fiscalYear: number`, `evalItemId: number`, `{ reason: string \| null }` | `{ error?: string; comment?: ManagerCommentPayload }` | 評価者 / ADMIN | 評価コメントを追加する。成功時は作成したコメントを返す |
| `updateManagerCommentAction` | `commentId: string`, `evaluateeId: string`, `{ reason?: string \| null }` | `{ error?: string; comment?: ManagerCommentPayload }` | コメント所有者 / ADMIN | 評価コメントを更新する。成功時は更新後のコメントを返す |
| `deleteManagerCommentAction` | `commentId: string`, `evaluateeId: string` | `{ error?: string }` | コメント所有者 / ADMIN | 評価コメントを削除する |

#### ManagerCommentPayload 型

```ts
type ManagerCommentPayload = {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  reason: string | null;
  createdAt: Date;
};
```

---

## エラー定義

| エラークラス | 用途 | HTTP 相当 |
|---|---|---|
| `BadRequestError` | 入力値検証エラー | 400 |
| `NotFoundError` | リソースが存在しない | 404 |
| `ForbiddenError` | 権限はあるが操作が禁止されている（自分自身の変更など） | 403 |
| `ConflictError` | ビジネスルール違反（重複・依存データあり・削除不可など） | 409 |
