# testing.md — テスト方針

## 完了条件

| 対象 | 完了条件 |
|------|---------|
| Server Actions（`src/app/**/actions.ts`） | ユニットテストの作成をもって完了 |
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

- `src/app/**/actions.ts`（Server Actions）はユニットテスト必須
- `src/lib/` 配下のユーティリティ関数はユニットテスト必須
- テストファイルは実装ファイルと同じディレクトリに `[name].test.ts` で配置
- Prisma・Clerk 等の外部依存は `vi.mock` でモック化する
- テストファイル先頭に `// @vitest-environment node` を付ける

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

| ケース | 条件 |
|--------|------|
| 正常系 | 期待する戻り値 |
| 境界値・エッジケース | 空文字、フォーマット違反、範囲外の値など |

---

## 手動テスト

機能実装・修正後は [docs/e2e-scenarios.md](e2e-scenarios.md) の対応セクションを参照して動作確認を行う。

- シナリオを追加・変更した場合は `prisma/seed.ts` のテストデータも見直し、シナリオが実行可能な状態を保つこと

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

シードで作成されるテストユーザーの詳細は [`docs/development.md`](development.md) の「テストデータ投入（Seed）」節を参照。

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

詳細は [`docs/development.md`](development.md) の「テストデータ投入（Seed）」節を参照。

```bash
npx prisma db seed
```
