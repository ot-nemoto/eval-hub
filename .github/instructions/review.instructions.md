---
applyTo: "**"
---

# Copilot PR レビュー指示

このファイルは GitHub Copilot の PR レビュー観点を定義する。
以下のルールに基づいてレビューし、違反があれば指摘すること。

---

## アーキテクチャ方針

- バックエンド処理は **Server Actions / Server Components** で実装する（API Route は原則使用しない）
- ビジネスロジックは **`src/lib/` 配下に集約**する
  - Server Action はできるだけ薄く保ち、実処理は `src/lib/` の関数に委譲する
  - 理由：将来的に REST API として公開する際に `src/lib/` を再利用できる設計にしている
- `src/lib/` に直接 Prisma 呼び出しを書いても良い（Repository パターンは採用しない）

## Server Actions 規約

- 各ページディレクトリに `actions.ts` を配置する（`"use server"` ディレクティブ）
- 戻り値の型は `Promise<{ error?: string }>` に統一する
- 各 Server Action の先頭で `getSession()` を呼び出して認証チェックをする
  - 未認証: `redirect("/login")`
  - 権限なし（非 admin が admin 系 Action を呼んだ場合）: `redirect("/evaluations")`
- 処理成功後は `revalidatePath()` でキャッシュを更新する
- `src/lib/` のカスタムエラー（`BadRequestError` / `NotFoundError` 等）は catch して `{ error: message }` を返す。それ以外は再 throw する

## 権限制御

- `MEMBER`（自己評価）: `evaluateeId == 自分` のレコードの `selfScore / selfReason` のみ更新可
- `MEMBER`（評価者）: `evaluationAssignments` に `evaluatorId == 自分` のレコードがある被評価者の `managerScore / managerReason` のみ更新可
- `ADMIN`: すべてのデータ操作可
- `manager` ロールは廃止済み。評価権限は `evaluationAssignments` で動的に管理する

## コーディングルール

- コメントは自明でないロジックにのみ付ける（過剰なコメント不要）
- エラーハンドリングは外部入力・APIレスポンスの境界でのみ行う
- 内部コードやフレームワークの保証がある箇所に防御的コードを追加しない

## テストルール

- **APIルートの実装にはユニットテストが必要**（テストがなければ指摘する）
- **`src/lib/` 配下のユーティリティ関数にはユニットテストが必要**
- UIコンポーネントのユニットテストは必須としない

## バージョン準拠ルール

- フレームワーク・ライブラリの使い方は `package.json` のバージョンに準拠しているか確認する
- 古いバージョンの慣習（非推奨 API・廃止されたパターン）を指摘する場合は、`package.json` のバージョンに基づく仕様を根拠にすること

## ドキュメント更新ルール

- 仕様変更を伴う実装の場合、`docs/` 配下の該当ドキュメントも更新されているか確認する
- API の変更には `docs/api.md` の更新、スキーマ変更には `docs/schema.md` の更新が必要

## セキュリティ・アクセス制御

- API ルートでロールチェック（`admin` 専用操作など）が適切に行われているか確認する
- ユーザーが他ユーザーのデータにアクセスできる抜け穴がないか確認する
- SQL インジェクション・XSS などの OWASP Top 10 脆弱性がないか確認する

## 実装スコープルール

- 指示されたタスク以外の変更が混入していないか確認する
- リファクタリング・コメント追加・型注釈など、依頼外の変更は指摘する

## フレームワーク・ライブラリ固有の仕様

- **`src/proxy.ts`** は Next.js 16 以降の middleware ファイル名（旧 `middleware.ts` から改名）。`middleware.ts` に変更するよう指摘しないこと
- Prisma フィールド名は **camelCase**、DB カラム名は **snake_case**。複数語フィールドは `@map("snake_case_name")` で明示的にマッピングする。フィールド名と DB カラム名が同一表記になる単語は `@map` を省略してよい
- dynamic route の params は `Promise<{ id: string }>` 型。`const { id } = await params;` で取得する（Next.js 15+ の仕様）。`await` を削除するよう指摘しないこと

## カスタムエラーの使い分け

`src/lib/errors.ts` で定義されたカスタムエラーを用途に応じて使い分ける。

| エラークラス | 用途 |
|---|---|
| `NotFoundError` | リソースが存在しない場合 |
| `ForbiddenError` | 権限はあるが操作が禁止されている場合（自分自身の変更など） |
| `ConflictError` | ビジネスルール違反（重複・依存データあり・削除不可など） |
| `BadRequestError` | 入力値検証エラー |

- `lib/` 層でカスタムエラーを throw し、Server Action の catch で `{ error: message }` に変換する
- Prisma の P2002（ユニーク制約違反）・P2003（FK制約違反）は catch して `ConflictError` に変換する
- 予期しないエラーは再 throw する（握りつぶさない）

## Server Component と Client Component の責任分離

- **Server Component**: DB クエリ・認証チェック・データ変換を担う。`async function` で定義する
- **Client Component**: state 管理・ユーザーインタラクション・Server Action の呼び出しを担う。`"use client"` を付ける
- Server Component から Client Component へは**純データのみ**を Props として渡す（Prisma オブジェクトをそのまま渡さない）
- 複数 DB クエリは `Promise.all()` で並列実行する

## フォーム実装パターン

- `useActionState` は使わず、`useState` + `try-catch` で手動管理する
- フォームの状態は `open`（開閉）/ `loading`（送信中）/ エラーメッセージ の state で管理する
- Server Action の戻り値 `{ error }` が存在する場合は `alert(result.error)` で表示する
- 通信エラー（catch）は `alert("通信エラーが発生しました")` でシンプルに処理する
- 成功後はフォームの state をリセットして閉じる

## テストの書き方

- ファイル先頭に `// @vitest-environment node` を付ける
- `vi.mock("@/lib/prisma", ...)` で Prisma クライアントをモックする
- `beforeEach` で `vi.clearAllMocks()` を呼び出す
- `vi.mocked()` でモック関数を型付きで参照する
- トップレベルの `describe()` は関数名、`it()` は日本語でテストケースを説明する
- 正常系と異常系を分けて記述する

### 最低限カバーすべき観点

#### API ルート（`src/app/api/**/route.ts`）

| ケース | 条件 |
|--------|------|
| 正常系 | 期待するステータスコードとレスポンス |
| バリデーションエラー | 400 を返す |
| 認証エラー | 401 を返す |
| 認可エラー | 403 を返す（認可チェックがある場合） |
| リソース未存在 | 404 を返す（該当する場合） |
| リソース重複 | 409 を返す（該当する場合） |

#### ユーティリティ関数（`src/lib/`）

| ケース | 条件 |
|--------|------|
| 正常系 | 期待する戻り値 |
| 境界値・エッジケース | 空文字、フォーマット違反、範囲外の値など |
