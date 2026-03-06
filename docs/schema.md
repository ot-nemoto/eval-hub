> 最終更新: 2026-03-06 (DB: TiDB Cloud Serverless に変更)

# schema.md — DB スキーマ定義

## TiDB (MySQL) 固有の注意点

- `TEXT[]` は MySQL で使えないため **`Json` 型**に変更（例: `["server side engineer", "Software Architect"]`）
- `UUID` は `VARCHAR(36)` で代替（TiDB は UUID 型なし）
- `ENUM` は Prisma の `enum` 定義を使用（MySQL の ENUM にマップ）
- `relationMode = "prisma"` のため、FK カラムには `@@index` を明示的に定義

## ER 概要

```
users
 ├── career_plans (1:N)
 │    └── goals (1:N)
 ├── evaluations (1:N) ※年度×UID
 ├── role_members (N:M) ← roles
 └── monthly_records (1:N)

evaluation_items
 ├── evaluations (1:N)
 ├── role_eval_mappings (1:N) ← roles
 └── goal_eval_links (N:M) ← goals

allocations
 └── evaluation_items (N:M) × divisions
```

---

## テーブル定義

### users — 社員・ユーザー

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | VARCHAR(36) | PK | UUID 文字列 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | ログイン用メール |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt ハッシュ |
| name | VARCHAR(100) | NOT NULL | 氏名 |
| division | VARCHAR(100) | | 所属事業部 |
| joined_at | DATE | | 入社日 |
| role | ENUM | NOT NULL | `admin` / `manager` / `member` |
| manager_id | VARCHAR(36) | FK → users.id, INDEX | 上長 |
| wants_president_meeting | BOOLEAN | DEFAULT false | 社長面談希望 |
| created_at | TIMESTAMP | DEFAULT now() | |
| updated_at | TIMESTAMP | | |

### assignment_histories — 配属履歴

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | VARCHAR(36) | PK | |
| user_id | VARCHAR(36) | FK → users.id, INDEX | |
| fiscal_year | INTEGER | NOT NULL | 年度（例: 2025） |
| division | VARCHAR(100) | NOT NULL | 配属事業部 |

### career_plans — 年度別キャリアプラン

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | VARCHAR(36) | PK | |
| user_id | VARCHAR(36) | FK → users.id, INDEX | |
| fiscal_year | INTEGER | NOT NULL | 年度 |
| current_roles_self | Json | | 現在ロール（自己認識）例: `["server side engineer"]` |
| current_roles_official | Json | | 現在ロール（公式） |
| current_position | VARCHAR(50) | | 現在役職 |
| future_roles_self | Json | | 将来ロール（自己）例: `["Software Architect"]` |
| future_position_self | VARCHAR(50) | | 将来役職（自己） |
| future_comment | TEXT | | 将来への補足コメント |
| achievements_pr | TEXT | | 本年度成果・自由PR |
| next_year_goals | TEXT | | 来年度に向けた目標 |
| interim_comment | TEXT | | 中間面談コメント（上長） |
| final_comment | TEXT | | 期末面談コメント（上長） |
| UNIQUE | (user_id, fiscal_year) | | |

### goals — 年度目標

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | VARCHAR(36) | PK | |
| career_plan_id | VARCHAR(36) | FK → career_plans.id, INDEX | |
| category | VARCHAR(100) | | 大項目（例: 事業部活動） |
| title | VARCHAR(255) | NOT NULL | 目標タイトル |
| goal_criteria | TEXT | | Goal（達成基準） |
| action | TEXT | | 取り組み内容 |
| period | VARCHAR(50) | | 期間（例: 1Q-3Q） |
| progress | TEXT | | 進捗・結果（本人） |
| progress_official | TEXT | | 進捗・結果（上長補記） |
| sort_order | INTEGER | DEFAULT 0 | 表示順 |

### goal_eval_links — 目標と評価項目の紐付け

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| goal_id | VARCHAR(36) | FK → goals.id, INDEX | |
| eval_uid | VARCHAR(20) | FK → evaluation_items.uid, INDEX | |
| PRIMARY KEY | (goal_id, eval_uid) | | |

### evaluation_items — 評価項目マスタ

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| uid | VARCHAR(20) | PK | 例: `1-1-1`, `2-3-3` |
| target | VARCHAR(50) | NOT NULL | 大分類（例: employee, projects） |
| target_no | INTEGER | | 大分類番号 |
| category | VARCHAR(100) | NOT NULL | 中分類（例: engagement, programming） |
| category_no | INTEGER | | 中分類番号 |
| item_no | INTEGER | NOT NULL | 項目番号 |
| name | VARCHAR(255) | NOT NULL | 評価項目名 |
| description | TEXT | | 説明 |
| eval_criteria | TEXT | | 評価事例・基準 |
| two_year_rule | BOOLEAN | DEFAULT false | ２年ルール適用 |

### evaluations — 年度別採点記録

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | VARCHAR(36) | PK | |
| user_id | VARCHAR(36) | FK → users.id, INDEX | |
| fiscal_year | INTEGER | NOT NULL | 年度 |
| eval_uid | VARCHAR(20) | FK → evaluation_items.uid, INDEX | |
| self_score | ENUM | | `none` / `ka` / `ryo` / `yu`（なし/可/良/優） |
| self_reason | TEXT | | 自己採点理由 |
| manager_score | ENUM | | `none` / `ka` / `ryo` / `yu` |
| manager_reason | TEXT | | 上長採点理由 |
| UNIQUE | (user_id, fiscal_year, eval_uid) | | |

### roles — ロール定義

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | VARCHAR(36) | PK | |
| classification | VARCHAR(50) | NOT NULL | 分類（例: engineer, Architect） |
| name | VARCHAR(100) | NOT NULL | ロール名（例: server side engineer） |
| weight | INTEGER | DEFAULT 1 | 重み |
| description | TEXT | | 説明 |
| required_criteria | TEXT | | Required 基準 |
| special_criteria | TEXT | | Special 基準 |
| UNIQUE | (classification, name) | | |

### role_eval_mappings — ロール×評価項目マッピング

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | VARCHAR(36) | PK | |
| role_id | VARCHAR(36) | FK → roles.id, INDEX | |
| eval_uid | VARCHAR(20) | FK → evaluation_items.uid, INDEX | |
| necessity | ENUM | NOT NULL | `required`（○）/ `half`（△） |
| required_level | ENUM | NOT NULL | `none` / `ka` / `ryo` / `yu` |

### role_members — 社員のロール認定結果

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | VARCHAR(36) | PK | |
| user_id | VARCHAR(36) | FK → users.id, INDEX | |
| role_id | VARCHAR(36) | FK → roles.id, INDEX | |
| fiscal_year | INTEGER | NOT NULL | 年度 |
| judgment | ENUM | NOT NULL | `qualified` / `unqualified` / `none` |
| qualified_count | INTEGER | | 認定項目数 |
| total_count | INTEGER | | 対象項目数 |
| UNIQUE | (user_id, role_id, fiscal_year) | | |

### allocations — 事業部別配点

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | VARCHAR(36) | PK | |
| fiscal_year | INTEGER | NOT NULL | 年度 |
| division | VARCHAR(100) | NOT NULL | 事業部名 |
| eval_uid | VARCHAR(20) | FK → evaluation_items.uid, INDEX | |
| weight | INTEGER | NOT NULL | 配点 |
| UNIQUE | (fiscal_year, division, eval_uid) | | |

### monthly_records — 月次実績

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | VARCHAR(36) | PK | |
| user_id | VARCHAR(36) | FK → users.id, INDEX | |
| fiscal_year | INTEGER | NOT NULL | 年度 |
| record_month | DATE | NOT NULL | 対象月（月初日） |
| product | VARCHAR(100) | NOT NULL | プロダクト名 |
| task | VARCHAR(255) | NOT NULL | タスク名 |
| done | BOOLEAN | DEFAULT false | 実施済みフラグ |
| UNIQUE | (user_id, record_month, product, task) | | |

---

## インデックス

`relationMode = "prisma"` の場合、FK カラムのインデックスは Prisma が自動生成しないため、
`schema.prisma` に `@@index` を明示的に定義する。

```prisma
// 例：evaluations モデル
model evaluations {
  // ... カラム定義
  @@index([user_id, fiscal_year])
  @@index([eval_uid])
}

model career_plans {
  @@index([user_id, fiscal_year])
}

model role_members {
  @@index([user_id, fiscal_year])
  @@index([role_id])
}

model monthly_records {
  @@index([user_id, record_month])
}
```
