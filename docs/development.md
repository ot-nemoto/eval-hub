# development.md — ローカル開発環境セットアップ手順

最終更新: 2026-03-19

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

# ローカル開発用認証バイパス（任意、どちらか一方を設定）
# MOCK_USER_ID="<DB の users.id>"
# MOCK_USER_EMAIL="doigaki@example.com"
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

### 3-1. DB をリセットしたい場合

```bash
npx prisma migrate reset
```

> **注意**: `migrate reset` は seed を自動実行しますが、環境によってスキップされる場合があります。リセット後は必ず手動で seed を実行してください（手順 4）。

### 4. シードデータを投入

**ローカル環境**（`.env.local` の接続先を使う場合）：

```bash
npx prisma db seed
```

`.env` が空の場合、`seed.ts` は自動的に `.env.local` を読み込む。

**別の DB・Clerk テナントに投入したい場合**（インラインで接続先を上書き）：

```bash
DATABASE_URL=<接続先> CLERK_SECRET_KEY=<key> npx prisma db seed
```

> **仕組み**: `seed.ts` は `dotenv.config({ path: ".env.local" })` でファイルを読み込むが、
> dotenv はすでに設定済みの環境変数を上書きしないため、インライン指定した値が優先される。
> `CLERK_SECRET_KEY` が未設定の場合、Clerk へのユーザー登録はスキップされ DB のみ更新される。

シードで作成されるユーザーとパスワードは以下の通り（開発用）：

**共通パスワード**: `AmericanDogs`

| email | name | role | 検証シナリオ |
|-------|------|------|------------|
| doigaki@example.com | 土井垣将 | admin | 自己評価なし・評価アサインなし |
| shiranui@example.com | 不知火守 | admin | 2025のみ自己評価あり・上長評価される |
| yamada@example.com | 山田太郎 | member | 通年自己評価あり・評価者かつ被評価者 |
| satonaka@example.com | 里中智 | member | 通年自己評価あり・複数の上長に評価される |
| iwaki@example.com | 岩鬼正美 | member | 通年自己評価なし・評価アサインなし |

> **注意**: Clerk へのユーザー作成は `NODE_ENV !== 'production'` の場合のみ実行されます。本番環境ではスキップされます。

### 自己評価要否設定（evaluation_settings）

| ユーザー | 2025 | 2026 | 2027 | 備考 |
|----------|------|------|------|------|
| 土井垣将 | ✗ | ✗ | ✗ | レコードなし（デフォルト false） |
| 不知火守 | ✓ | ✗ | ✗ | 2025のみ明示的に true |
| 山田太郎 | ✓ | ✓ | ✓ | 全年度 true |
| 里中智   | ✓ | ✓ | ✓ | 全年度 true |
| 岩鬼正美 | ✗ | ✗ | ✗ | レコードなし（デフォルト false） |

> デフォルト値は `false`（自己評価なし）。レコードが存在しない場合は自己評価不要として扱う。

### 評価者アサイン（evaluation_assignments）

**2025年度**

| 被評価者 | 評価者（上長） |
|----------|----------------|
| 不知火守 | 土井垣将 |
| 山田太郎 | 土井垣将 |
| 里中智   | 不知火守 |
| 里中智   | 山田太郎 |

**2026年度**

| 被評価者 | 評価者（上長） |
|----------|----------------|
| 山田太郎 | 土井垣将 |
| 山田太郎 | 不知火守 |
| 里中智   | 不知火守 |
| 里中智   | 山田太郎 |

### 5. 開発サーバーを起動

```bash
npm run dev
```

`http://localhost:3000` にアクセスする。

---

## 認証バイパス（MOCK_USER_ID / MOCK_USER_EMAIL）

Clerk を使わずにローカルで動作確認したい場合、`MOCK_USER_ID` または `MOCK_USER_EMAIL` を設定することで認証をスキップできる。

```bash
# ID で指定（admin ユーザー例：土井垣将）
MOCK_USER_ID=<uuid> npm run dev

# メールアドレスで指定（より簡単）
MOCK_USER_EMAIL=doigaki@example.com npm run dev
MOCK_USER_EMAIL=yamada@example.com npm run dev
```

または `.env.local` に設定する：

```env
MOCK_USER_ID="<DB の users.id>"
# または
MOCK_USER_EMAIL="doigaki@example.com"
```

- `NODE_ENV !== 'production'` の場合のみ有効（本番環境では設定しても無視される）
- middleware の Clerk 認証と `getSession()` の両方をバイパスし、指定した DB ユーザーとして動作する
- `MOCK_USER_ID` と `MOCK_USER_EMAIL` を両方設定した場合は `MOCK_USER_ID` が優先される
- UUID は `npx prisma studio` またはユーザー管理画面で確認できる

---

## Prisma 操作

### マイグレーション

マイグレーションは**常に手動で実行**する（ビルドスクリプトによる自動実行は行わない）。

```bash
# スキーマ変更後に新しいマイグレーションを作成・適用（開発時）
npx prisma migrate dev --name <migration-name>

# 本番・ステージング環境への適用（デプロイ前に手動実行）
npx prisma migrate deploy
```

#### DB を完全リセットしてシードを投入し直す場合

```bash
# DB をリセット（全テーブル削除・マイグレーション再適用）
npx prisma migrate reset --force

# シードデータを投入
npx prisma db seed
```

### マイグレーション状態確認

```bash
npx prisma migrate status
```

---

## デプロイ（Vercel）

1. Vercel ダッシュボードで環境変数を設定（`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`）
2. デプロイ前に**手動**でマイグレーションを適用する

   ```bash
   npx prisma migrate deploy
   ```

3. `develop` ブランチへのプッシュ（またはマージ）で自動デプロイ（Build Command は `prisma generate && next build` のみ）

---

## よく使うコマンド

```bash
npm run dev          # 開発サーバー起動
npm run test         # ユニットテスト実行
npm run check        # Biome によるリント・フォーマット
npx prisma studio    # DB の GUI ブラウザを起動
npx prisma migrate dev --name <name>  # マイグレーションファイル作成（開発時）
npx prisma migrate deploy             # マイグレーション適用（本番・ステージング）
npx prisma db seed   # シードデータ投入
```
