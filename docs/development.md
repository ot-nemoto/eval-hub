# development.md — ローカル開発環境セットアップ手順

最終更新: 2026-03-18

---

## 前提

- [Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers) 対応の VSCode がインストールされていること
- Docker が起動していること

---

## セットアップ手順

### 1. リポジトリをクローンして devcontainer を起動

```bash
git clone https://github.com/ot-nemoto/eval-hub.git
cd eval-hub
```

VSCode で開き、**「Reopen in Container」** を選択する。

### 2. 環境変数を設定

`.env.local` をプロジェクトルートに作成し、以下を設定する。

```env
# Neon (PostgreSQL)
DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"
DIRECT_URL="postgresql://<user>:<password>@<host-direct>/<db>?sslmode=require"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/evaluations

# ローカル開発用認証バイパス（任意）
# MOCK_USER_ID="<DB の users.id>"
```

各値の取得先は以下を参照。

| 変数 | 取得先 |
|------|--------|
| `DATABASE_URL` / `DIRECT_URL` | [Neon コンソール](https://console.neon.tech) → プロジェクト → Connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | [Clerk ダッシュボード](https://dashboard.clerk.com) → API Keys |

### 3. DB マイグレーションを適用

```bash
npx prisma migrate deploy
```

### 4. シードデータを投入

```bash
npx prisma db seed
```

シードで作成されるユーザーとパスワードは以下の通り（開発用）：

| email | name | role | password |
|-------|------|------|----------|
| tanaka@example.com | 田中太郎 | admin | EvalHub#Dev2026! |
| suzuki@example.com | 鈴木花子 | member | EvalHub#Dev2026! |
| sato@example.com | 佐藤健 | member | EvalHub#Dev2026! |

> **注意**: Clerk へのユーザー作成は `NODE_ENV !== 'production'` の場合のみ実行されます。本番環境ではスキップされます。
>
> シードスクリプトの詳細は `docs/seed.md` を参照。

### 5. 開発サーバーを起動

```bash
npm run dev
```

`http://localhost:3000` にアクセスする。

---

## 認証バイパス（MOCK_USER_ID）

Clerk を使わずにローカルで動作確認したい場合、`.env.local` に `MOCK_USER_ID` を設定することで認証をスキップできる。

```env
MOCK_USER_ID="<DB の users.id>"
```

- 設定すると Clerk の認証フローが完全にバイパスされる
- `MOCK_USER_ID` に設定した ID のユーザーとして動作する
- **本番環境では絶対に設定しないこと**

---

## よく使うコマンド

```bash
npm run dev          # 開発サーバー起動
npm run test         # ユニットテスト実行
npm run check        # Biome によるリント・フォーマット
npx prisma studio    # DB の GUI ブラウザを起動
npx prisma migrate dev --name <name>  # マイグレーションファイル作成
npx prisma db seed   # シードデータ投入
```
