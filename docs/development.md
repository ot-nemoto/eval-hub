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

# 2. .env を作成し、環境変数を設定する（下の「環境変数」節を参照）

# 3. DB マイグレーションを適用する
npx prisma migrate deploy

# 4. 開発サーバーを起動する
npm run dev
```

---

## 環境変数

`.env` をプロジェクトルートに作成し、以下の変数を設定する。

```env
# Database（Neon）
DATABASE_URL="postgresql://<user>:<password>@<pooler-host>/<db>?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://<user>:<password>@<direct-host>/<db>?sslmode=require&channel_binding=require"

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

Clerk 認証なしで動作確認するため、`MOCK_USER_ID` または `MOCK_USER_EMAIL` を `.env` に設定する。

- 設定すると `src/proxy.ts`（middleware）が Clerk 認証をスキップし、`src/lib/auth.ts` の `getSession()` が DB から直接ユーザーを返す
- **優先順位**: `MOCK_USER_ID` > `MOCK_USER_EMAIL`（両方設定した場合は `MOCK_USER_ID` が使われる）
- **本番環境（`NODE_ENV=production`）では設定しても無効**

---

## DB 操作

### マイグレーション

マイグレーションの実行タイミングは環境によって異なる。

- **Vercel デプロイ時**: `vercel-build` スクリプト（`prisma migrate deploy && next build`）により自動実行
- **ローカル開発**: 手動で実行する

```bash
# スキーマ変更後に新しいマイグレーションを作成・適用（開発時）
npx prisma migrate dev --name <migration-name>

# 本番・ステージング環境への適用（Vercel 以外の環境で手動実行する場合）
npx prisma migrate deploy

# マイグレーション状態確認
npx prisma migrate status
```

#### DB を完全リセットしてシードを投入し直す場合

Prisma 7 の `migrate reset` はシードを自動実行しない（`--skip-seed` オプションも廃止されている）ため、リセット後にシードを明示的に実行する。リセット直後の DB は空でシードユーザーが 0 件になるため、2 つのフラグを両方前置する必要がある。

```bash
npx prisma migrate reset --force
SEED_ALLOW_DESTRUCTIVE=1 SEED_ALLOW_UNSEEDED_DB=1 npx prisma db seed
```

> **注意: マイグレーション履歴の一本化について**
>
> 2026-04-08 (T34) に、旧マイグレーション（複数ファイル）を `20260408151219_init` 1本に統合しました。
>
> **背景**: 手動作成した `uppercase_role_enum` マイグレーションが shadow DB に非対応の SQL を含んでおり、`prisma migrate dev` が通らない状態でした。当時の開発 DB をリセットする前提で一本化しました。
>
> この変更以前の環境からセットアップし直す場合は、**`npx prisma migrate reset` で DB を完全リセットしてから** `SEED_ALLOW_DESTRUCTIVE=1 npx prisma db seed` を実行してください。
>
> **注意**: ここでの DB リセットは**ローカル開発用 DB に対する操作**です。本番 DB は実在し、`develop` / `master` への push で Vercel が `prisma migrate deploy` を実行して適用します（環境構成は `.claude/project.md` 参照）。`migrate reset` を本番に対して実行してはなりません。

### テストデータ投入（Seed・ローカル専用）

**ローカル専用**。本番・ステージングに対して実行してはならない。

```bash
SEED_ALLOW_DESTRUCTIVE=1 npx prisma db seed
```

> **シード済み DB への再実行は、毎回同じ状態になる。** シードはユーザー・年度以外（評価・評価項目バージョンとその詳細・アサイン・自己評価要否設定・マスタ）を全削除してから再構築する。評価項目バージョンは実行のたびに新規作成し、全年度をそれに付け替えるため、再実行後もバージョンは 1 件・詳細は評価項目と同じ件数になる（ID は実行ごとに変わる）。マイグレーションが作る詳細 0 件の「初期バージョン」も、初回のシードで削除される。

#### 誤実行に対する歯止め

| 段 | 条件 | 回避方法 |
|----|------|---------|
| 1 | `SEED_ALLOW_DESTRUCTIVE=1` が未設定なら中断する | 上記のとおり実行時に前置する |
| 2 | `CLERK_SECRET_KEY` が `sk_test_` で始まらなければ中断する | 回避不可（開発インスタンスに対してのみ実行する） |
| 3 | シード定義のユーザーが 1 件も存在しない DB なら中断する（本番 DB・未シードの新規 DB の可能性） | 意図した実行であれば `SEED_ALLOW_UNSEEDED_DB=1` を併せて前置する |

> **バイパスフラグ（`SEED_ALLOW_DESTRUCTIVE` / `SEED_ALLOW_UNSEEDED_DB`）は `.env` に書かない。** `.env` に置くと恒久的に有効になり、「毎回明示的に意図を示す」というガードの前提が崩れる。実行時にコマンドラインで前置する。`.env` に置くのは `SEED_PASSWORD` のみ。
> `SEED_ALLOW_UNSEEDED_DB=1` は新規 DB の初回シードでのみ必要。2 回目以降は不要なので付けない。
> **2 段目が本シードの最終防衛線である。** 本シードは `syncClerkUser` で既存 Clerk ユーザーのパスワードを上書きする。Clerk アプリは daily-hub / link-hub と共有しており、誤実行は 3 リポジトリのユーザーに波及する。
> 3 段目は「定義外ユーザーの存在」ではなく「シード済みでないこと」で判定する。開発者本人のアカウントが混在しうるため、定義外ユーザーの存在自体は正常とみなす必要がある。空の DB も通さない（削除対象が無くても、テストユーザーを既知のパスワードで作ってしまうため）。
> ただし 3 段目は万全ではない。シードユーザー行はアプリがサインイン時にも作る（`src/lib/auth.ts`）ため「シードが作った証拠」にはならない。本シードは所有者を持たないマスタデータ（`targets` / `categories` / `evaluation_items`）と評価項目バージョン（`eval_item_versions` / `eval_item_version_details`。年度への割り当ても外れる）も全削除するため、daily-hub のような削除範囲の絞り込みでは被害を限定できない。

シードで作成されるユーザーは以下の通り（開発用）：

**共通パスワード**: 環境変数 `SEED_PASSWORD` の値（`.env` に設定する）。シードは既存 Clerk ユーザーにもこの値を同期するため、変更したら次回シードで反映される。**値の変更は Clerk アプリを共有する daily-hub / link-hub にも影響するため、3 リポジトリ揃えて行う。**

| email | role | isActive | 検証シナリオ |
|-------|------|----------|------------|
| bonjiri@example.com | ADMIN | true | 自己評価なし・評価アサインなし（管理操作確認用） |
| tsukune@example.com | ADMIN | true | 2025のみ自己評価あり・上長評価される |
| tebasaki@example.com | MEMBER | true | 通年自己評価あり・評価者かつ被評価者・採点データあり |
| nankotsu@example.com | MEMBER | true | 通年自己評価あり・複数の上長に評価される |
| sunagimo@example.com | MEMBER | false | 無効化ユーザー（auth-error リダイレクト確認用） |
| torikawa@example.com | MEMBER | true | 評価なし・アサインなし（削除テスト用） |

> Clerk へのユーザー作成は `NODE_ENV !== 'production'` の場合のみ実行される。本番環境ではスキップされる。

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

Vercel は `package.json` の `vercel-build` スクリプトを優先して実行するため、マイグレーションはデプロイ時に自動適用される。Vercel ダッシュボードの Build Command 設定変更は不要。
