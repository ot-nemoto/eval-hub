# testing.md — テスト方針

## 完了条件

| 対象 | 完了条件 |
|------|---------|
| API ルート（`src/app/api/**/route.ts`） | ユニットテストの作成をもって完了 |
| ユーティリティ関数（`src/lib/`） | ユニットテストの作成をもって完了 |
| UI コンポーネント | 手動動作確認をもって完了（[docs/e2e-scenarios.md](e2e-scenarios.md) 参照） |

---

## ユニットテスト（Vitest）

### 実行

```bash
npm test                          # 1回実行
npm run test:watch                # ウォッチモード（開発中）
npx vitest run --reporter=verbose # テストケース名をすべて表示
npm run test:ui                   # UI モード（ブラウザで結果確認）
npm run test:coverage             # カバレッジレポート出力
```

### 対象・方針

- `src/app/api/**/route.ts`（API ルート）はユニットテスト必須
- `src/lib/` 配下のユーティリティ関数はユニットテスト必須
- テストファイルは実装ファイルと同じディレクトリに `[name].test.ts` で配置
- Prisma・Clerk 等の外部依存は `vi.mock` でモック化する
- テストファイル先頭に `// @vitest-environment node` を付ける（API ルートは Node 環境で実行）

```ts
// モック例
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));
```

### カバレッジ方針

#### API ルート

| ケース | 条件 |
|--------|------|
| 正常系 | 期待するステータスコードとレスポンス |
| バリデーションエラー | 400 を返す |
| 認証エラー | 401 を返す |
| 認可エラー | 403 を返す（認可チェックがある場合） |
| リソース未存在 | 404 を返す（該当する場合） |
| リソース重複 | 409 を返す（該当する場合） |

#### ユーティリティ関数

| ケース | 条件 |
|--------|------|
| 正常系 | 期待する戻り値 |
| 境界値・エッジケース | 空文字、フォーマット違反、範囲外の値など |

---

## 手動テスト

機能実装・修正後は [docs/e2e-scenarios.md](e2e-scenarios.md) の対応セクションを参照して動作確認を行う。

---

## E2E テスト（Playwright MCP）

### 認証バイパス

開発環境では `MOCK_USER_EMAIL` または `MOCK_USER_ID` を `.env.local` に設定することで Clerk 認証をバイパスできる。E2E テストでは `MOCK_USER_EMAIL` を使用する。

| テストの種類 | MOCK の要否 |
|------------|------------|
| 機能テスト・ロールベースのシナリオ | MOCK 使用 |
| isActive=false の挙動 | MOCK 使用（代替可能） |
| 実際の Clerk ログイン・ログアウトフロー | 手動確認 |

### テストユーザー（`prisma/seed.ts` のシードデータ）

| メール | ロール | isActive | 主な用途 |
|--------|--------|----------|---------|
| `doigaki@example.com` | admin | true | 管理画面の操作確認（評価なし） |
| `shiranui@example.com` | admin | true | 評価者・管理者の複合確認 |
| `yamada@example.com` | member | true | 被評価者のメインユーザー |
| `satonaka@example.com` | member | true | ユーザー分離テスト |
| `iwaki@example.com` | member | true | 評価なし状態の確認 |

### Playwright MCP への指示例

```
以下の手順で E2E テストを実施してください。

## 事前準備
1. `npx prisma db seed` を実行してテストデータを初期化する
2. `.env.local` の `MOCK_USER_EMAIL` にテストユーザーのメールアドレスを設定する
3. `npm run dev` でサーバーを起動する（ポート: 3000）

## 制約
- MOCK_USER_EMAIL を設定した状態では Clerk の実認証フローは確認できない
- テストユーザーを切り替える場合は .env.local を書き換えてサーバーを再起動すること

## テスト対象
docs/e2e-scenarios.md の [テストしたいセクション名] を参照してテストを実施してください。
```

---

## テストデータ投入（Seed）

### 概要

`prisma/seed.ts` を使って手動テスト用のデータを投入できる。実行のたびに既存データを upsert で更新するため、テスト前に実行することでクリーンな状態を保証できる。

### 投入データ

| ユーザー名 | メール | ロール | 評価状況 |
|-----------|--------|--------|---------|
| 土井垣将 | `doigaki@example.com` | admin | 評価なし |
| 不知火守 | `shiranui@example.com` | admin | 2025年度 自己評価あり |
| 山田太郎 | `yamada@example.com` | member | 全年度 評価あり（評価者: 土井垣/不知火） |
| 里中智 | `satonaka@example.com` | member | 全年度 評価あり（評価者: 不知火/山田） |
| 岩鬼正美 | `iwaki@example.com` | member | 評価なし |

年度: 2025・2026（current）・2027

### 実行

```bash
npx prisma db seed
```
