# testing.md — テスト方針

## 完了条件

| 対象 | 完了条件 |
|------|---------|
| Server Actions（`src/app/**/actions.ts`） | ユニットテストの作成をもって完了 |
| ユーティリティ関数（`src/lib/`） | ユニットテストの作成をもって完了 |
| UI コンポーネント | Playwright MCP による E2E テスト実行をもって完了 |

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

## E2E テスト（Playwright MCP）

### テストユーザー

**E2E テストはシード実行済みであることを前提とする。** シードの実行方法は [`docs/development.md` — テストデータ投入](development.md#テストデータ投入seed) を参照。

| ユーザー | メールアドレス | パスワード | 用途 |
|---------|-------------|---------|------|
| bonjiri | `bonjiri@example.com` | `Yakitori2026` | 管理操作テスト（ADMIN・自己評価なし・アサインなし） |
| tsukune | `tsukune@example.com` | `Yakitori2026` | 被評価者テスト（ADMIN・評価データあり） |
| tebasaki | `tebasaki@example.com` | `Yakitori2026` | 評価者・被評価者ロールのテスト（MEMBER） |
| nankotsu | `nankotsu@example.com` | `Yakitori2026` | 複数評価者に評価されるユーザーのテスト（MEMBER） |
| sunagimo | `sunagimo@example.com` | `Yakitori2026` | 無効化ユーザーの auth-error リダイレクト確認（isActive=false） |
| torikawa | `torikawa@example.com` | `Yakitori2026` | ロール変更・削除操作のテスト対象（MEMBER・関連データなし） |

### 実施方法

テスト対象の URL と [`docs/e2e-scenarios.md`](e2e-scenarios.md) のシナリオをモデルに渡して実施する。
