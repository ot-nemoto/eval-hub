# auth.md — 認証フロー・移行手順

最終更新: 2026-04-05（初回ユーザーを admin として自動作成する仕様を追記）

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
      → 未ヒット（新規サインアップ）   → DB にユーザー自動作成（DBが空なら role: ADMIN、以降は role: MEMBER）
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

## 保護対象ルート

`src/proxy.ts` は以下のパスを**除いた全ルート**を認証必須とする。

| パス | 認証 | 理由 |
|------|------|------|
| `/login` | 不要 | Clerk のサインインページ |
| `/auth-error` | 不要 | 認証エラー表示ページ（無効化ユーザー等） |
| その他全パス | **必須** | 未認証なら Clerk が `/login` へリダイレクト |

---

## セッション管理

| 項目 | 内容 |
|------|------|
| 戦略 | Clerk JWT |
| 保存場所 | Clerk が管理する httpOnly Cookie |
| `session.user.id` | DB の `users.id`（UUID） |
| `session.user.name` | DB の `users.name` |
| `session.user.role` | DB の `users.role`（`ADMIN` / `MEMBER`） |

### セッション取得方法

```typescript
// API ルート・サーバーコンポーネント
import { getSession } from "@/lib/auth";
const session = await getSession();
const userId = session?.user?.id;
```

`getSession()` が `null` を返した場合：
- API ルート → 401 を返す
- ページ（dashboard layout）→ Clerk セッションがなければ `/login`、あれば `/auth-error` へリダイレクト

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

- `role` は DB にユーザーが 0 人の場合（初回ログイン）は `ADMIN`、以降は `MEMBER`
- `name` は Clerk の `fullName` → `firstName` → メールアドレスの順でフォールバック
- 2 人目以降のユーザーの `ADMIN` 昇格は DB 直接操作または管理者 API で行う

---

## Clerk ユーザー削除時のデータ保持方針

Clerk 側でユーザーを削除しても、DB の `users` レコードおよび関連する評価・実績データは削除しない。

- **理由**: 過去の評価データ・実績は組織の記録として残す必要があるため
- **挙動**: Clerk 削除後は該当ユーザーがログインできなくなるが、DB データはそのまま保持される
- **Webhook 未実装**: Clerk の `user.deleted` イベントは受け取らず、DB との同期は行わない（意図的）
