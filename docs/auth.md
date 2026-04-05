# auth.md — 認証フロー・移行手順

最終更新: 2026-03-18（認証競合時のエラーページ対応を追記）

---

## 認証基盤

Clerk を使用した認証基盤。`@clerk/nextjs` v7 系。

---

## getSession() のフロー

```
Clerk にユーザーがいない → null → /login へリダイレクト
         ↓
clerk_id で DB 検索
  → ヒット → セッション返却
  → 未ヒット
       ↓
    Clerk のメールアドレス取得
       ↓
    メールで DB 検索
      → 未ヒット（新規サインアップ）   → DB にユーザー自動作成（role: member）
      → ヒット・clerk_id なし         → clerk_id を紐付けてセッション返却
      → ヒット・clerk_id あり         → null
（既存ユーザー初回ログイン）
（別 Clerk ID に紐付き済み）
```

`getSession()` が null を返した場合、ダッシュボード layout が以下のように振り分ける：

- **Clerk セッションなし**（未認証）→ `/login` へリダイレクト
- **Clerk セッションあり**（認証競合）→ `/auth-error` へリダイレクト

### /auth-error ページ

`src/app/auth-error/page.tsx` にエラーメッセージとサインアウトボタンを表示する。
Clerk middleware では公開ルートとして設定しているため、未認証状態でもアクセス可能。

---

## 既存ユーザーの Clerk 移行手順（T46）

### 前提

Clerk 移行前に DB に登録済みのユーザーは、Clerk にアカウントがないためそのままではログインできない。
以下の手順で Clerk へのインポートとパスワード再設定を行う。

### 手順

#### 1. Clerk ダッシュボードでユーザーを招待

Clerk ダッシュボード → **Users** → **Invite** から既存ユーザーのメールアドレスを招待する。

または、以下のスクリプトで一括インポートする（Node.js + Clerk Backend API）：

```typescript
// scripts/invite-existing-users.ts
import { createClerkClient } from "@clerk/backend";
import { prisma } from "../src/lib/prisma";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const users = await prisma.user.findMany({
  where: { clerk_id: null },
  select: { email: true, name: true },
});

for (const user of users) {
  await clerk.invitations.createInvitation({ emailAddress: user.email });
  console.log(`Invited: ${user.email}`);
}
```

#### 2. ユーザーが招待メールからパスワードを設定

ユーザーが招待メールを受け取り、パスワードを設定してサインアップを完了する。

#### 3. 初回ログイン時の自動紐付け

`getSession()` がメールアドレスで突合し、DB の既存ユーザーレコードに `clerk_id` を自動的に紐付ける（T45 実装済み）。

### 補足

- 招待ではなく「パスワードリセット」フローも利用可能：Clerk ダッシュボード → **Users** → 対象ユーザー → **Send password reset email**
- 招待メールの文面は Clerk ダッシュボードの **Customization** でカスタマイズできる

---

## 新規サインアップユーザーの自動登録（T51）

Clerk でサインアップしたユーザーが DB に存在しない場合、`getSession()` が初回アクセス時に自動的に `users` レコードを作成する。

- `role` はデフォルト `member`
- `name` は Clerk の `fullName` → `firstName` → メールアドレスの順でフォールバック
- `admin` へのロール昇格は DB 直接操作または管理者 API で行う

---

## Clerk ユーザー削除時のデータ保持方針

Clerk 側でユーザーを削除しても、DB の `users` レコードおよび関連する評価・実績データは削除しない。

- **理由**: 過去の評価データ・実績は組織の記録として残す必要があるため
- **挙動**: Clerk 削除後は該当ユーザーがログインできなくなるが、DB データはそのまま保持される
- **Webhook 未実装**: Clerk の `user.deleted` イベントは受け取らず、DB との同期は行わない（意図的）
