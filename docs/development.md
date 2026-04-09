# development.md — 開発・運用手順

## ローカルセットアップ

### 前提条件

- [Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers) 対応の VS Code
- Docker

### セットアップ手順

```bash
# 1. リポジトリをクローンして VS Code で開き、「Reopen in Container」を選択する
git clone https://github.com/ot-nemoto/eval-hub.git
#    コンテナ起動時に npm install が自動実行される

# 以降のコマンドはすべて devcontainer 内（リポジトリルート）で実行する

# 2. .env.local を作成し、環境変数を設定する（下の「環境変数」節を参照）

# 3. DB マイグレーションを適用する
npx prisma migrate deploy

# 4. 開発サーバーを起動する
npm run dev
```

---

## 環境変数

`.env.local` をプロジェクトルートに作成し、以下の変数を設定する。

```env
# Database（Neon）
DATABASE_URL="postgresql://<user>:<password>@<pooler-host>/<db>?sslmode=require"
DIRECT_URL="postgresql://<user>:<password>@<direct-host>/<db>?sslmode=require"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/evaluations

# ローカル開発用認証バイパス（任意、どちらか一方を設定）
# MOCK_USER_ID="<DB の users.id>"
# MOCK_USER_EMAIL="doigaki@example.com"
```

各値の取得先：

| 変数 | 取得先 |
|------|--------|
| `DATABASE_URL` / `DIRECT_URL` | [Neon コンソール](https://console.neon.tech) → プロジェクト → Connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | [Clerk ダッシュボード](https://dashboard.clerk.com) → API Keys |

### ローカル開発用認証バイパス

Clerk 認証なしで動作確認するため、`MOCK_USER_ID` または `MOCK_USER_EMAIL` を `.env.local` に設定する。

- 設定すると `src/proxy.ts`（middleware）が Clerk 認証をスキップし、`src/lib/auth.ts` の `getSession()` が DB から直接ユーザーを返す
- **優先順位**: `MOCK_USER_ID` > `MOCK_USER_EMAIL`（両方設定した場合は `MOCK_USER_ID` が使われる）
- **本番環境（`NODE_ENV=production`）では設定しても無効**

---

## DB 操作

### マイグレーション

マイグレーションは**常に手動で実行**する（ビルドスクリプトによる自動実行は行わない）。

```bash
# スキーマ変更後に新しいマイグレーションを作成・適用（開発時）
npx prisma migrate dev --name <migration-name>

# 本番・ステージング環境への適用（デプロイ前に手動実行）
npx prisma migrate deploy

# マイグレーション状態確認
npx prisma migrate status
```

#### DB を完全リセットしてシードを投入し直す場合

```bash
npx prisma migrate reset --force
npx prisma db seed
```

> **注意: マイグレーション履歴の一本化について**
>
> 2026-04-08 (T34) に、旧マイグレーション（複数ファイル）を `20260408151219_init` 1本に統合しました。
>
> **背景**: 手動作成した `uppercase_role_enum` マイグレーションが shadow DB に非対応の SQL を含んでおり、`prisma migrate dev` が通らない状態でした。本プロジェクトは開発環境のみで本番 DB への適用環境はないため、DB リセットを前提に一本化しました。
>
> この変更以前の環境からセットアップし直す場合は、**`npx prisma migrate reset` で DB を完全リセットしてから** `npx prisma db seed` を実行してください。

### テストデータ投入（Seed）

```bash
npx prisma db seed
```

シードで作成されるユーザーとパスワードは以下の通り（開発用）：

**共通パスワード**: `Yakitori2026`

| email | role | isActive | 検証シナリオ |
|-------|------|----------|------------|
| bonjiri@example.com | ADMIN | true | 自己評価なし・評価アサインなし（管理操作確認用） |
| tsukune@example.com | ADMIN | true | 2025のみ自己評価あり・上長評価される |
| tebasaki@example.com | MEMBER | true | 通年自己評価あり・評価者かつ被評価者・採点データあり |
| nankotsu@example.com | MEMBER | true | 通年自己評価あり・複数の上長に評価される |
| sunagimo@example.com | MEMBER | false | 無効化ユーザー（auth-error リダイレクト確認用） |
| torikawa@example.com | MEMBER | true | 評価なし・アサインなし（削除テスト用） |

> Clerk へのユーザー作成は `NODE_ENV !== 'production'` の場合のみ実行される。本番環境ではスキップされる。

詳細は [`docs/testing.md`](./testing.md) の「テストデータ投入（Seed）」節を参照。

### Prisma Studio

```bash
# ブラウザで DB の内容を確認・編集できる GUI を起動する
npx prisma studio
```

---

## デプロイ手順

### アプリのデプロイ

`develop` または `master` ブランチへの push で Vercel が自動検知しデプロイする。

```
git push origin develop  →  Vercel Preview デプロイ
git push origin master   →  Vercel Production デプロイ + GitHub Releases 自動作成
```

### 本番マイグレーション

**アプリデプロイ前に必ず実施する（順序: migrate → deploy）**

devcontainer から本番の `DATABASE_URL` / `DIRECT_URL` を設定した上で実行する。

```bash
npx prisma migrate deploy
```
