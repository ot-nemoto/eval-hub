# auth.md — 認証フロー・移行手順

最終更新: 2026-03-18

---

## 認証基盤

Clerk を使用した認証基盤。`@clerk/nextjs` v7 系。

---

## getSession() のフロー

```
Clerk にユーザーがいない → null
         ↓
clerk_id で DB 検索
  → ヒット → セッション返却
  → 未ヒット
       ↓
    Clerk のメールアドレス取得
       ↓
    メールで DB 検索
      → 未ヒット（新規サインアップ） → DB にユーザー自動作成（role: member）
      → ヒット・clerk_id なし（既存ユーザー初回ログイン） → clerk_id を紐付け
      → ヒット・clerk_id あり（別 Clerk ID に紐付き済み） → null
```

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
