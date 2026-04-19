# ui.md — UI設計書

## 画面一覧・遷移

### 画面一覧

| 画面 | パス | レイアウト | アクセス制限 |
|------|------|-----------|------------|
| ログイン | `/login` | ヘッダーなし | 未認証のみ |
| 認証エラー | `/auth-error` | ヘッダーなし | なし |
| 自己評価一覧 | `/evaluations` | ヘッダーあり | 要ログイン |
| 社員一覧 | `/members` | ヘッダーあり | 要ログイン |
| メンバー別評価 | `/members/[id]/evaluations` | ヘッダーあり | 要ログイン（アサイン済み評価者 / admin） |
| 管理：大分類・中分類マスタ | `/admin/targets` | ヘッダーあり | admin のみ |
| 管理：評価項目マスタ | `/admin/evaluation-items` | ヘッダーあり | admin のみ |
| 管理：年度管理 | `/admin/fiscal-years` | ヘッダーあり | admin のみ |
| 管理：ユーザー一覧 | `/admin/users` | ヘッダーあり | admin のみ |
| 管理：自己評価要否設定 | `/admin/users/[id]/evaluation-settings` | ヘッダーあり | admin のみ |
| 管理：評価者アサイン管理 | `/admin/evaluation-assignments` | ヘッダーあり | admin のみ |
| 管理：全ユーザー自己評価一覧 | `/admin/self-evaluations` | ヘッダーあり | admin のみ |
| 管理：全ユーザー上長評価一覧 | `/admin/manager-evaluations` | ヘッダーあり | admin のみ |
| 管理：評価進捗ダッシュボード | `/admin/progress` | ヘッダーあり | admin のみ |

### 画面遷移

```mermaid
flowchart TD
    classDef screen fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef nav fill:#fef9c3,stroke:#ca8a04,color:#713f12

    UNAUTH([未認証アクセス])
    LOGIN["ログイン"]:::screen
    AUTH_ERROR["認証エラー"]:::screen
    EVALUATIONS["自己評価一覧"]:::screen
    MEMBERS["社員一覧"]:::screen
    MEMBER_EVAL["メンバー別評価"]:::screen
    ADMIN_TARGETS["大分類・中分類マスタ"]:::screen
    ADMIN_ITEMS["評価項目マスタ"]:::screen
    ADMIN_YEARS["年度管理"]:::screen
    ADMIN_USERS["ユーザー一覧"]:::screen
    ADMIN_SETTINGS["自己評価要否設定"]:::screen

    UNAUTH -->|"Clerk Middleware"| LOGIN
    LOGIN -->|"ログイン成功"| EVALUATIONS
    LOGIN -->|"別 Clerk ID に紐付き済み / 無効化"| AUTH_ERROR
    AUTH_ERROR -->|"サインアウト"| LOGIN

    EVALUATIONS --> MEMBERS
    MEMBERS --> MEMBER_EVAL

    ADMIN_USERS --> ADMIN_SETTINGS

    subgraph Header ["Header（全画面共通）"]
        direction LR
        H_EVAL("評価"):::nav
        H_MEMBERS("メンバー"):::nav
        H_ADMIN_USERS("ユーザー管理 admin"):::nav
        H_ADMIN_YEARS("年度管理 admin"):::nav
        H_ADMIN_TARGETS("マスタ管理 admin"):::nav
        H_ADMIN_ITEMS("評価項目管理 admin"):::nav
        H_LOGOUT("ログアウト"):::nav
    end

    H_EVAL --> EVALUATIONS
    H_MEMBERS --> MEMBERS
    H_ADMIN_USERS --> ADMIN_USERS
    H_ADMIN_YEARS --> ADMIN_YEARS
    H_ADMIN_TARGETS --> ADMIN_TARGETS
    H_ADMIN_ITEMS --> ADMIN_ITEMS
    H_LOGOUT -->|"Clerk サインアウト"| LOGIN
```

---

## 画面機能仕様

### ログイン（`/login`）

Clerk の SignIn UI を表示する。メールアドレス＋パスワードで認証し、成功後は自己評価一覧へ遷移する。

### 認証エラー（`/auth-error`）

アカウントが別の Clerk ID に紐付き済みの場合、または無効化されたユーザーがログインした場合に表示する。サインアウトボタンのみ提供し、ログイン画面へ誘導する。

### 自己評価一覧（`/evaluations`）

ログインユーザー本人の評価項目一覧を表示し、自己評価を入力・保存できる。

| 機能 | 説明 |
|------|------|
| タブ切り替え | 中分類ごとにタブで切り替え |
| 評価項目カード | UID・項目名・説明・評価基準を表示 |
| 自己採点 | なし / 可 / 良 / 優 のボタン選択。選択中は青ハイライト |
| 自己採点理由 | テキストエリアで入力 |
| 保存ボタン | 項目ごとに個別保存。保存中は「保存中...」表示、成功後2秒間「保存しました」表示 |
| 空状態 | 評価項目がない場合は「評価項目がありません。」を表示 |

`self_evaluation_enabled = false` の場合、自己評価入力フォームを非表示にする。

対象年度が **ロック済み**（`is_locked = true`）の場合、画面上部に「🔒 この年度はロック済みです。閲覧のみ可能です。」バナーを表示し、入力 UI（採点ボタン・テキストエリア・保存ボタン）を非表示にして閲覧専用モードに切り替える。

### 社員一覧（`/members`）

対象年度の被評価者一覧を表示する。現在年度（`fiscal_years.is_current = true`）が未設定の場合は `/evaluations` にリダイレクトする。

**閲覧権限：** 対象年度に評価者または被評価者としてアサインされているユーザー、および ADMIN。アサインに一切関与していない MEMBER は空リスト（「表示できる社員がいません。」）を表示する。

| 機能 | 説明 |
|------|------|
| メンバー一覧 | 対象年度の被評価者の氏名・所属部署を表示 |
| 評価リンク | 自分がアサインされている被評価者、または admin は全員へのリンクを表示 |

### メンバー別評価（`/members/[id]/evaluations`）

指定メンバーへの評価者評価を入力・保存できる。

| 機能 | 説明 |
|------|------|
| タブ切り替え | 中分類ごとにタブで切り替え |
| 評価項目カード | UID・項目名・説明・評価基準を表示 |
| 評価者採点 | なし / 可 / 良 / 優 のボタン選択 |
| 評価者採点理由 | テキストエリアで入力 |
| 保存ボタン | 項目ごとに個別保存 |

アクセス制御：要ログイン。`/members` 一覧には、対象年度に評価者または被評価者として関与している場合のみメンバーが表示され、関与していない場合は空状態となる。以下の「リンク（一覧）」は、その一覧に表示されたメンバーに対して、アクセス者の役割に応じて切り替わる。

| 条件 | リンク（一覧） | ページモード |
|------|-------------|------------|
| 年度ロック済み（全員） | 参照 → | 読み取り専用 |
| 自分自身 | 自己評価 → | 読み取り専用（自己評価ページへ） |
| 担当の被評価者（アサイン済み） | 評価入力 → | 編集可能 |
| 担当外の被評価者 | 参照 → | 読み取り専用 |

当該年度に被評価者として登録されていないユーザーの URL に直接アクセスした場合は 404 を返す。

#### 評価者コメント

評価ページのコメントスレッドは以下のルールで編集・削除ボタンを表示する。

| ロール | 自分のコメント | 他者のコメント |
|--------|-------------|-------------|
| MEMBER（評価者） | 編集・削除ボタンを表示 | ボタン非表示 |
| ADMIN | 編集・削除ボタンを表示 | **編集・削除ボタンを表示**（全コメント管理可） |

対象年度が **ロック済み**（`is_locked = true`）の場合、画面上部に「🔒 この年度はロック済みです。閲覧のみ可能です。」バナーを表示し、採点ボタン・保存ボタン・コメント追加／編集／削除ボタンをすべて非表示にして閲覧専用モードに切り替える。

### 管理：大分類・中分類マスタ（`/admin/targets`）

大分類の一覧表示・追加・編集・削除を行う。中分類が紐づいている場合は削除不可（エラー表示）。

### 管理：評価項目マスタ（`/admin/evaluation-items`）

評価項目の一覧表示・追加・編集・削除を行う。大分類・中分類を選択して登録する。

### 管理：年度管理（`/admin/fiscal-years`）

年度の一覧表示・追加・編集・削除・現在年度設定・ロック設定を行う。関連データがある年度は削除不可。

| 機能 | 説明 |
|------|------|
| 年度一覧 | 年度名・期間・現在年度フラグ・ロック状態を表示 |
| 現在年度設定 | `is_current = true` は常に1件のみ |
| ロック/解除 | ADMIN が年度をロック（`is_locked = true`）すると、その年度の評価編集を一括禁止。解除も可能 |
| 有効評価項目管理 | 年度ごとに有効な評価項目を追加・削除 |

### 管理：ユーザー一覧（`/admin/users`）

全ユーザーの一覧を表示し、ロール変更・有効化/無効化・削除を操作できる。

| 表示項目 | 説明 |
|---------|------|
| 名前・メール | ユーザー情報 |
| ロール | `admin` / `member`。変更ボタンで切り替え |
| 有効フラグ | 無効化ユーザーはグレーアウト表示 |
| 操作 | ロール変更・有効化/無効化・削除（自分自身への操作は不可） |

削除は確認ダイアログを表示。関連データがある場合は削除不可（エラー表示）。

### 管理：自己評価要否設定（`/admin/users/[id]/evaluation-settings`）

指定ユーザーの年度別自己評価要否（`self_evaluation_enabled`）をトグルで切り替える。

### 管理：評価進捗ダッシュボード（`/admin/progress`）

全被評価者の評価入力状況を年度別に一覧表示する。ADMIN のみ閲覧可能。

| 表示項目 | 説明 |
|---------|------|
| 社員名 | 被評価者の氏名 |
| 自己評価 進捗 | 入力済み件数 / 全件数（%）。`self_score != null` のレコード数でカウント |
| 上長評価 進捗 | 入力済み件数 / 全件数（%）。`manager_score != null` のレコード数でカウント |
| 最終更新日 | その被評価者の評価レコードの最新 `updated_at`。レコードなしの場合は「—」 |

フィルター：年度セレクトボックス（`AdminYearSelector`）。デフォルトは現在年度。進捗率は 100% で緑・1〜99% で黄・0% でグレー表示。

### 管理：全ユーザー自己評価一覧（`/admin/self-evaluations`）

全ユーザーの自己評価入力内容を年度・ユーザーで絞り込んで一覧表示する。

| 表示項目 | 説明 |
|---------|------|
| 社員名 | 被評価者の氏名 |
| UID | 評価項目の一意識別子（例: `1-1-1`） |
| 評価項目 | 評価項目名称 |
| 自己採点 | なし / 可 / 良 / 優（未入力は「未入力」と表示） |
| 自己採点理由 | 本人が入力したコメント（長い場合は truncate） |
| 最終更新日時 | レコードの `updated_at` を表示 |

フィルター：年度セレクトボックス（`AdminYearSelector`）・ユーザーセレクトボックス（`AdminUserFilter`）をヘッダー下に並べて表示。デフォルトは現在年度・全ユーザー。

---

### 管理：全ユーザー上長評価一覧（`/admin/manager-evaluations`）

全ユーザーの上長評価入力内容を年度・ユーザーで絞り込んで一覧表示する。

| 表示項目 | 説明 |
|---------|------|
| 社員名 | 被評価者の氏名 |
| UID | 評価項目の一意識別子（例: `1-1-1`） |
| 評価項目 | 評価項目名称 |
| 上長採点 | なし / 可 / 良 / 優（未入力は「未入力」と表示） |
| 上長採点理由 | 最新コメントの理由テキスト（コメントなしは「—」） |
| 評価者名 | 最新コメントの投稿者名（コメントなしは「—」） |
| 最終更新日時 | レコードの `updated_at` を表示 |

フィルター：年度セレクトボックス（`AdminYearSelector`）・ユーザーセレクトボックス（`AdminUserFilter`）をヘッダー下に並べて表示。デフォルトは現在年度・全ユーザー。

---

## 各画面の表示状態

### 自己評価一覧（`/evaluations`）

| 状態 | 条件 | 表示 |
|------|------|------|
| Loading | データ取得中 | ページ全体スケルトン（`animate-pulse`） |
| Empty | 有効な評価項目が 0 件 | 「評価項目がありません。」（`text-gray-500`） |
| Error | API エラー / 権限なし | エラーメッセージ（`text-red-600`）、データは非表示 |

### 社員一覧（`/members`）

| 状態 | 条件 | 表示 |
|------|------|------|
| Loading | データ取得中 | ページ全体スケルトン |
| Empty | 有効なメンバーが 0 件 | 「メンバーがいません。」（`text-gray-500`） |
| Error | API エラー | エラーメッセージ（`text-red-600`） |

### メンバー別評価（`/members/[id]/evaluations`）

| 状態 | 条件 | 表示 |
|------|------|------|
| Loading | データ取得中 | ページ全体スケルトン |
| Empty | 評価項目が 0 件 | 「評価項目がありません。」（`text-gray-500`） |
| Error | API エラー / アクセス権限なし | エラーメッセージ（`text-red-600`） |
| SaveError | 採点保存失敗 | ボタン下部にインラインエラー（`text-sm text-red-600`） |

### 管理：大分類・中分類マスタ（`/admin/targets`）

| 状態 | 条件 | 表示 |
|------|------|------|
| Loading | データ取得中 | テーブルスケルトン |
| Empty | 大分類が 0 件 | 「大分類がありません。」（`text-gray-500`） |
| Error | 削除時に中分類が紐づいている | フォーム上部エラーメッセージ（`text-red-600`） |

### 管理：評価項目マスタ（`/admin/evaluation-items`）

| 状態 | 条件 | 表示 |
|------|------|------|
| Loading | データ取得中 | テーブルスケルトン |
| Empty | 評価項目が 0 件 | 「評価項目がありません。」（`text-gray-500`） |
| Error | 削除時に年度に紐づいている | フォーム上部エラーメッセージ（`text-red-600`） |

### 管理：年度管理（`/admin/fiscal-years`）

| 状態 | 条件 | 表示 |
|------|------|------|
| Loading | データ取得中 | テーブルスケルトン |
| Empty | 年度が 0 件 | 「年度がありません。」（`text-gray-500`） |
| Error | 削除時に関連データが存在する | フォーム上部エラーメッセージ（`text-red-600`） |
| Locked | 対象年度がロック済み | 黄色バナー「🔒 この年度はロック済みです。閲覧のみ可能です。」を表示し、入力 UI を非表示 |

### 管理：ユーザー一覧（`/admin/users`）

| 状態 | 条件 | 表示 |
|------|------|------|
| Loading | データ取得中 | テーブルスケルトン |
| Empty | ユーザーが 0 件 | 「ユーザーがいません。」（`text-gray-500`） |
| Error | 削除時に関連データが存在する / 自分自身の削除 | フォーム上部エラーメッセージ（`text-red-600`） |

### 管理：自己評価要否設定（`/admin/users/[id]/evaluation-settings`）

| 状態 | 条件 | 表示 |
|------|------|------|
| Loading | データ取得中 | テーブルスケルトン |
| Empty | 年度が 0 件 | 「設定可能な年度がありません。」（`text-gray-500`） |
| Error | API エラー | エラーメッセージ（`text-red-600`） |

### 管理：評価進捗ダッシュボード（`/admin/progress`）

| 状態 | 条件 | 表示 |
|------|------|------|
| Empty（年度未選択） | 年度が 1 件も登録されていない | 「年度を選択してください。」（テーブル内中央） |
| Empty（データなし） | 対象年度にアサインされた被評価者が 0 件 | 「評価データがありません。」（テーブル内中央、`text-gray-500`） |

### 管理：全ユーザー自己評価一覧（`/admin/self-evaluations`）

| 状態 | 条件 | 表示 |
|------|------|------|
| Empty（年度未選択） | 年度が 1 件も登録されていない | 「年度を選択してください。」（テーブル内中央） |
| Empty（データなし） | フィルター条件に一致するレコードが 0 件 | 「評価データがありません。」（テーブル内中央、`text-gray-500`） |

---

## レイアウト構成

### layout.tsx 階層

```
src/app/layout.tsx（RootLayout）
  ClerkProvider
  └─ html[lang="ja"]
       └─ body
            ├─ src/app/(auth)/login/[[...rest]]/page.tsx   ヘッダーなし
            ├─ src/app/auth-error/page.tsx                  ヘッダーなし
            └─ src/app/(dashboard)/layout.tsx（DashboardLayout）
                 Header（NavLinks + SignOutButton）
                 └─ /evaluations
                 └─ /members/*
                 └─ /admin/*
```

### ページ幅

| 幅クラス | 使用箇所 |
|---------|---------|
| `max-w-5xl` | ヘッダー内コンテンツ、全ダッシュボードページのメインコンテンツ |

---

## コンポーネント一覧

### 共通コンポーネント（`src/components/`）

| コンポーネント | 種別 | 用途 | 使用箇所 |
|--------------|------|------|---------|
| `NavLinks` | Client Component | ロールに応じたナビゲーションリンク。member は評価・メンバー、admin はさらに管理メニューを表示 | DashboardLayout |
| `SignOutButton` | Clerk 提供 | ログアウト処理。`redirectUrl="/login"` を指定 | DashboardLayout |
| `ui/Button` | Client Component | 共通ボタン（variant: default / outline / secondary / destructive 等） | 全画面 |

### ページ内コンポーネント（`src/components/evaluation/`）

| コンポーネント | 種別 | 用途 |
|--------------|------|------|
| `EvaluationTabs` | Client Component | 自己評価入力。中分類タブ・採点ボタン・理由テキストエリア・個別保存 |
| `ManagerEvaluationTabs` | Client Component | 評価者採点入力。中分類タブ・自己評価表示・最終スコアセクション（evaluations.manager_score、アサイン済み評価者/admin が上書き可）・コメントスレッド（投稿者名・理由・日時）・追加フォーム・自コメントの編集/削除（ADMIN は全コメントの編集/削除可） |

### ページ内コンポーネント（`src/components/admin/`）

| コンポーネント | 種別 | 用途 |
|--------------|------|------|
| `TargetForm` | Client Component | 大分類の追加・編集フォーム |
| `TargetActions` | Client Component | 大分類の編集・削除ボタン |
| `CategoryForm` | Client Component | 中分類の追加・編集フォーム |
| `CategoryActions` | Client Component | 中分類の編集・削除ボタン |
| `EvaluationItemForm` | Client Component | 評価項目の追加・編集フォーム |
| `EvaluationItemActions` | Client Component | 評価項目の編集・削除ボタン |
| `FiscalYearForm` | Client Component | 年度の追加・編集フォーム |
| `FiscalYearActions` | Client Component | 年度の編集・削除・現在年度設定・ロック/解除ボタン |
| `UserActions` | Client Component | ユーザーのロール変更・有効化/無効化・削除ボタン |
| `EvaluationSettingToggle` | Client Component | 自己評価要否のトグルスイッチ |
| `AdminYearSelector` | Client Component | 年度絞り込みセレクトボックス。`year` クエリパラメータを更新して遷移 |
| `AdminUserFilter` | Client Component | ユーザー絞り込みセレクトボックス。`userId` クエリパラメータを更新して遷移 |

---

## UI 規約

### ページ構造の共通パターン

```tsx
// ダッシュボードレイアウト全体
<div className="min-h-screen bg-gray-50">
  <header className="border-b bg-white px-6 py-4">
    <div className="mx-auto flex max-w-5xl items-center justify-between">
      ...
    </div>
  </header>
  <main className="mx-auto max-w-5xl px-6 py-8">
    {children}
  </main>
</div>
```

### ボタン

shadcn/ui ベースの `Button` コンポーネント（`src/components/ui/button.tsx`）を使用する。

| variant | 用途 |
|---------|------|
| `default` | 保存・作成などの主要アクション |
| `outline` | キャンセル・編集などの補助アクション |
| `secondary` | 二次的なアクション |
| `destructive` | 削除・無効化などの破壊的操作 |

管理画面のインライン操作ボタン（ロール変更・有効化/無効化・削除）は `<button>` 直書きで `text-xs` サイズを使用。

### フォーム入力

```tsx
// 通常状態
className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

// エラー状態（バリデーション失敗時）
className="... border-red-500"
```

### フィードバックパターン

| 状態 | 表示方法 |
|------|---------|
| エラー | `<span className="text-sm text-red-600">...</span>` |
| 送信中 | ボタンテキスト変更（例: `"保存中..."`) + `disabled` |
| 保存成功 | テキスト一時表示（例: 「保存しました」、2秒後に非表示） |
| 空状態 | `<p className="text-gray-500">〇〇がありません。</p>` |

### 採点ボタン

自己評価・評価者評価の採点選択には専用のボタン UI を使用する。

```tsx
// 選択中
className="rounded-md px-3 py-1.5 text-sm font-medium bg-blue-600 text-white"

// 未選択
className="rounded-md px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
```
