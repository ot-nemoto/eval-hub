---
applyTo: "**"
---

# Copilot PR レビュー指示

このファイルは GitHub Copilot の PR レビュー観点を定義する。
以下のルールに基づいてレビューし、違反があれば指摘すること。

重大度の定義：
- **BLOCKER**: マージ前に必ず修正が必要
- **MAJOR**: 修正を強く推奨（設計・品質上の問題）
- **NIT**: 軽微な改善提案（任意対応）

---

## アーキテクチャ方針

- バックエンド処理は **Server Actions / Server Components** で実装する（API Route は原則使用しない）
- ビジネスロジックは **`src/lib/` 配下に集約**する
  - Server Action はできるだけ薄く保ち、実処理は `src/lib/` の関数に委譲する
  - 理由：将来的に REST API として公開する際に `src/lib/` を再利用できる設計にしている
- `src/lib/` に直接 Prisma 呼び出しを書いても良い（Repository パターンは採用しない）

### 違反チェック

- `src/app/api/**/route.ts` が新規追加されている場合、その必要性（外部連携・認証コールバック等）が確認できなければ **MAJOR** で指摘する
- Server Action に含めるべきロジックが `src/lib/` を通さず直接 Server Action 内に実装されている場合は **MAJOR** で指摘する

---

## Server Actions 規約

- 各ページディレクトリに `actions.ts` を配置する（`"use server"` ディレクティブ）
- 戻り値は少なくとも `error?: string` を含める（例: `Promise<{ error?: string }>` / `Promise<{ error?: string; comment?: Comment }>`）
- 各 Server Action の先頭で `getSession()` を呼び出して認証チェックをする
  - 未認証: `redirect("/login")`
  - 権限なし（非 admin が admin 系 Action を呼んだ場合）: `redirect("/evaluations")`
- 処理成功後は `revalidatePath()` でキャッシュを更新する
- `src/lib/` のカスタムエラー（`BadRequestError` / `NotFoundError` 等）は catch して `{ error: message }` を返す。それ以外は再 throw する

### 違反チェック

| 違反内容 | 重大度 |
|---|---|
| Server Action の先頭に `getSession()` 呼び出しがない | **BLOCKER** |
| 戻り値に `error?: string` が含まれていない | **MAJOR** |
| `revalidatePath()` が呼ばれていない（DB 変更がある場合） | **MAJOR** |
| 全例外を握りつぶして再 throw していない（`catch { return { error } }` のみ） | **MAJOR** |

---

## 権限制御

- `MEMBER`（自己評価）: `evaluateeId == 自分` のレコードの `selfScore / selfReason` のみ更新可
- `MEMBER`（評価者）: `evaluationAssignments` に `evaluatorId == 自分` のレコードがある被評価者の `managerScore / managerReason` のみ更新可
- `ADMIN`: すべてのデータ操作可
- `manager` ロールは廃止済み。評価権限は `evaluationAssignments` で動的に管理する

### 違反チェック

| 違反内容 | 重大度 |
|---|---|
| MEMBER が他ユーザーのデータを取得・更新できる実装になっている | **BLOCKER** |
| admin 専用操作でロールチェック（`session.user.role !== "ADMIN"`）がない | **BLOCKER** |
| `manager` ロールが参照・使用されている | **MAJOR** |

---

## コーディングルール

- コメントは自明でないロジックにのみ付ける（過剰なコメント不要）
- エラーハンドリングは外部入力・APIレスポンスの境界でのみ行う
- 内部コードやフレームワークの保証がある箇所に防御的コードを追加しない

### 違反チェック

| 違反内容 | 重大度 |
|---|---|
| フレームワークや型システムが保証している箇所に不要な null チェック・型ガードが追加されている | **NIT** |
| 自明なコード（変数代入・return 文等）に説明コメントが付いている | **NIT** |

---

## テストルール

- **APIルートの実装にはユニットテストが必要**
- **`src/lib/` 配下のユーティリティ関数にはユニットテストが必要**
- UIコンポーネントのユニットテストは必須としない

### 違反チェック

| 違反内容 | 重大度 |
|---|---|
| `src/lib/*.ts` が追加・変更されているのに対応する `*.test.ts` がない | **BLOCKER** |

---

## バージョン準拠ルール

- フレームワーク・ライブラリの使い方は `package.json` のバージョンに準拠しているか確認する
- 古いバージョンの慣習（非推奨 API・廃止されたパターン）を指摘する場合は、`package.json` のバージョンに基づく仕様を根拠にすること

### 違反チェック

| 違反内容 | 重大度 |
|---|---|
| `package.json` のバージョンで廃止・非推奨となったAPIを使用している | **MAJOR** |
| バージョン根拠なしに「このパターンは古い」と指摘しようとしている場合（レビュアー自身への注意） | 指摘しないこと |

---

## ドキュメント更新ルール（必須）

- 以下に該当する変更がある場合、対応する `docs/` 更新は **MUST（必須）**。
- 差分に必要なドキュメント更新が無い場合、レビューでは **必ず指摘** し、**Request changes 相当の重大度（BLOCKER）** として扱うこと。

### 判定条件（差分ベース）

1. **UI/UX 変更**
   - 対象例: `src/app/**`, `src/components/**` の画面表示・操作フロー・入力制約・文言変更
   - 必須更新: `docs/e2e-scenarios.md`
   - 指摘条件: 上記コード変更があるのに `docs/e2e-scenarios.md` の差分がない

2. **外部 REST API 仕様変更**
   - 対象例: `src/app/api/**/route.ts` の新規追加・エンドポイント変更
   - 必須更新: `docs/api.md`
   - 指摘条件: 上記変更があるのに `docs/api.md` の差分がない

3. **Server Actions 仕様変更**
   - 対象例: `src/app/**/actions.ts` の引数・戻り値・認可ロジックの変更
   - 必須更新: `docs/actions.md`
   - 指摘条件: 上記変更があるのに `docs/actions.md` の差分がない

4. **スキーマ変更**
   - 対象例: Prisma schema / migration / DB カラム変更
   - 必須更新: `docs/schema.md`
   - 指摘条件: 上記変更があるのに `docs/schema.md` の差分がない

### レビューコメントの出し方（固定）

- 未更新を検知したら、次の形式でコメントすること：

`[BLOCKER] ドキュメント更新不足: <必要なdocファイル> が更新されていません。変更内容（<変更ファイルまたは機能>）に対応するシナリオ/仕様を追記してください。`

---

## セキュリティ・アクセス制御

- API ルートでロールチェック（`admin` 専用操作など）が適切に行われているか確認する
- ユーザーが他ユーザーのデータにアクセスできる抜け穴がないか確認する
- SQL インジェクション・XSS などの OWASP Top 10 脆弱性がないか確認する

### 違反チェック

| 違反内容 | 重大度 |
|---|---|
| ユーザー入力を Prisma クエリの `where` などの検索条件に、入力バリデーションや認可条件なしで反映している | **BLOCKER** |
| `dangerouslySetInnerHTML` を使用している | **BLOCKER** |
| API ルートでロールチェックが行われていない | **BLOCKER** |
| セッション情報を使わずリクエストパラメータのユーザー ID を信頼している | **BLOCKER** |

---

## 実装スコープルール

- 指示されたタスク以外の変更が混入していないか確認する
- リファクタリング・コメント追加・型注釈など、依頼外の変更は指摘する

### 違反チェック

| 違反内容 | 重大度 |
|---|---|
| PR の説明に含まれないファイルが変更されている | **MAJOR** |
| 依頼外のリファクタリングが混入している | **NIT** |

---

## フレームワーク・ライブラリ固有の仕様

- **`src/proxy.ts`** は Next.js 16 以降の middleware ファイル名（旧 `middleware.ts` から改名）。`middleware.ts` に変更するよう指摘しないこと
- Prisma フィールド名は **camelCase**、DB カラム名は **snake_case**。複数語フィールドは `@map("snake_case_name")` で明示的にマッピングする。フィールド名と DB カラム名が同一表記になる単語は `@map` を省略してよい
- dynamic route の params は `Promise<{ id: string }>` 型。`const { id } = await params;` で取得する（Next.js 15+ の仕様）。`await` を削除するよう指摘しないこと

---

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

### 違反チェック

| 違反内容 | 重大度 |
|---|---|
| カスタムエラーを使わず汎用 `Error` をスローしている | **MAJOR** |
| Prisma の P2002 / P2003 を握りつぶして `ConflictError` に変換していない | **MAJOR** |
| 用途と異なるカスタムエラーを使っている（例: 入力エラーに `NotFoundError`） | **NIT** |

---

## Server Component と Client Component の責任分離

- **Server Component**: DB クエリ・認証チェック・データ変換を担う。`async function` で定義する
- **Client Component**: state 管理・ユーザーインタラクション・Server Action の呼び出しを担う。`"use client"` を付ける
- Server Component から Client Component へは**純データのみ**を Props として渡す（Prisma オブジェクトをそのまま渡さない）
- 複数 DB クエリは `Promise.all()` で並列実行する

### 違反チェック

| 違反内容 | 重大度 |
|---|---|
| Client Component 内で直接 DB クエリ・Prisma 呼び出しを行っている | **BLOCKER** |
| Server Component から Prisma の型オブジェクトをそのまま Props として渡している | **MAJOR** |
| 独立した複数の DB クエリを `await` で逐次実行している（`Promise.all()` 未使用） | **MAJOR** |

---

## フォーム実装パターン

### 複雑なフォーム（複数 state を持つ場合）

- `useState` で `loading`（送信中）・エラーメッセージの state を管理する
- Server Action の戻り値 `{ error }` が存在する場合は `alert(result.error)` で表示する
- 通信エラー（catch）は `alert("通信エラーが発生しました")` でシンプルに処理する
- 成功後はフォームの state をリセットして閉じる

### シンプルな単一操作ボタン（`DeleteButton` など）

- `useActionState` を使っても良い（`<form action={formAction}>` パターンで送信するシンプルな操作に限る）
- それ以外の用途では `useState` + 非同期ハンドラのパターンを使う

### 違反チェック

| 違反内容 | 重大度 |
|---|---|
| 複雑なフォームで `useActionState` を使用している（状態管理が必要な場面） | **MAJOR** |
| Server Action の `{ error }` を `alert()` 以外の方法で表示している（ただし UI で inline 表示する場合は許容） | **NIT** |
| 通信エラー（catch）を無視・握りつぶしている | **MAJOR** |
| 成功後にフォーム state をリセットしていない | **NIT** |

---

## テストの書き方

- ファイル先頭に `// @vitest-environment node` を付ける
- `vi.mock("@/lib/prisma", ...)` で Prisma クライアントをモックする
- Server Action など Prisma を直接参照しない場合は、必要な `@/lib/*` をモックするパターンも許容する
- `beforeEach` で `vi.clearAllMocks()` を呼び出す
- `vi.mocked()` でモック関数を型付きで参照する
- トップレベルの `describe()` は関数名、`it()` は日本語でテストケースを説明する
- 正常系と異常系を分けて記述する

### 違反チェック

| 違反内容 | 重大度 |
|---|---|
| `// @vitest-environment node` がない | **MAJOR** |
| `beforeEach` で `vi.clearAllMocks()` を呼んでいない | **MAJOR** |
| 正常系のみで異常系テストがない | **MAJOR** |

### 最低限カバーすべき観点

#### ユーティリティ関数（`src/lib/`）

| ケース | 条件 |
|--------|------|
| 正常系 | 期待する戻り値 |
| 境界値・エッジケース | 空文字、フォーマット違反、範囲外の値など |
