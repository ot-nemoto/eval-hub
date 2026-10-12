# auth.md — 認証フロー・移行手順

最終更新: 2026-10-11（外部 REST API の API キー認証を追記）

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

## 外部 REST API の API キー認証

外部 REST API（`/api/*`）は Clerk ではなく `Authorization: Bearer <api-key>` で認証する（`getAuthenticatedUser`）。

- **書式**: `eh_` + base64url(32 bytes)。prefix はキー種別・発行元の識別と、自前スキャナ（gitleaks 等）でのルール化のため（GitHub secret scanning の検出対象にはならない）
- **旧書式**: 平文保存時代の UUID 書式のキーは、マイグレーションでハッシュ化して移行済みでそのまま使える。認証時に書式チェックはしない（入れると移行済みキーが一律 401 になる）
- **保存**: DB には SHA-256（hex）のみ保存し、平文は保存しない。生値は発行・再生成の直後に一度だけ返す（show-once）。個人設定モーダルも発行直後のみ実値を表示する
- **ソルト無しの理由**: キーは高エントロピー乱数で辞書攻撃が成立しない。ソルト付き（bcrypt / argon2 等）にすると `where` で一意に引けず全件照合になるため使わない（GitHub / Stripe 等と同方式）
- **照合**: 受け取ったキーをハッシュ化し、`api_key_hash` の UNIQUE インデックスで引く（DB の等価比較のため timing-safe 比較は不要）
- **ハッシュ実装**: Web Crypto（`crypto.subtle.digest`）を使い Edge / Node 両対応。移行 SQL の `encode(sha256(convert_to(api_key, 'UTF8')), 'hex')` と同じ値になる。`api_key::bytea` は text からの I/O 変換キャストとして bytea の入力書式で解析され（`\x` で始まる値は hex 解釈・バックスラッシュはエスケープ扱い）、エラーにならずに別のハッシュになり得るため使わない
- 1 ユーザー 1 キー。再生成で旧キーは即時無効、失効で未発行に戻る。有効期限は持たず、`api_key_last_used_at` での棚卸しで代替する。`api_key_last_used_at` は 1 時間に 1 回まで更新し、更新失敗で認証済みリクエストを落とさない（付随情報のため握りつぶして次回に委ねる）
- 非アクティブ（`is_active: false`）のユーザーはキーが一致しても 401

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
