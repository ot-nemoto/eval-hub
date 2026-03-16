> 最終更新: 2026-03-06

# seed.md — マスタデータ管理

## 方針

マスタデータは `prisma/seeds/` 配下の JSON ファイルで管理する。
評価基準・ロール要件の変更は **JSON の編集 → 再シード** だけで完結し、コード変更不要。

## ファイル構成

```
prisma/
├── schema.prisma
├── seed.ts          ← シードスクリプト本体
└── seeds/
    ├── evaluation_items.json   ← 評価項目マスタ
    ├── roles.json              ← ロール定義
    ├── role_eval_mappings.json ← ロール×評価項目マッピング（判定基準）
    └── allocations.json        ← 事業部別配点
```

---

## 各ファイルの仕様

### evaluation_items.json

```json
[
  {
    "uid": "1-1-1",
    "target": "employee",
    "target_no": 1,
    "category": "engagement",
    "category_no": 1,
    "item_no": 1,
    "name": "会社員としての基本姿勢",
    "description": "挨拶をする\n電話を率先して取る...",
    "eval_criteria": "下記のうち一つ以上の取り組みがある・・・可\n3つ以上・・・良\n5つ以上・・・優",
    "two_year_rule": false
  },
  {
    "uid": "2-3-3",
    "target": "projects",
    "target_no": 2,
    "category": "programming",
    "category_no": 3,
    "item_no": 3,
    "name": "サーバーサイドプログラミング能力",
    "description": "サーバ/言語/フレームワークの特性に合わせたプログラム設計・実装する",
    "eval_criteria": "...",
    "two_year_rule": false
  }
]
```

### roles.json

```json
[
  {
    "classification": "engineer",
    "name": "server side engineer",
    "weight": 1,
    "description": "サーバ/言語/フレームワークの特性に合わせたプログラム設計・実装する",
    "required_criteria": "①一人称でゼロから一人月以上の規模を持つサーバサイドアプリケーションを複数回作成している...",
    "special_criteria": "A.該当するアーキテクチャの資格試験を取得している..."
  },
  {
    "classification": "Architect",
    "name": "Software Architect",
    "weight": 1,
    "description": "...",
    "required_criteria": "...",
    "special_criteria": "..."
  }
]
```

### role_eval_mappings.json

**ここを編集することで判定基準を変更できる。**

```json
[
  {
    "role_classification": "engineer",
    "role_name": "server side engineer",
    "eval_uid": "2-3-3",
    "necessity": "required",
    "required_level": "yu"
  },
  {
    "role_classification": "engineer",
    "role_name": "server side engineer",
    "eval_uid": "2-3-8",
    "necessity": "required",
    "required_level": "ryo"
  },
  {
    "role_classification": "engineer",
    "role_name": "server side engineer",
    "eval_uid": "2-3-2",
    "necessity": "half",
    "required_level": "ka"
  }
]
```

**`necessity` の値：**
- `"required"` → ○（必須：すべて pass が必要）
- `"half"` → △（半必須：過半数の pass が必要）

**`required_level` の値：**
- `"ka"` → 可以上
- `"ryo"` → 良以上
- `"yu"` → 優のみ

### allocations.json

```json
[
  {
    "fiscal_year": 2025,
    "division": "事業部C",
    "eval_uid": "1-1-1",
    "weight": 10
  },
  {
    "fiscal_year": 2025,
    "division": "事業部C",
    "eval_uid": "2-3-3",
    "weight": 20
  }
]
```

---

## シードスクリプト（seed.ts）の動作

```
1. evaluation_items.json を upsert（uid が一致する場合は更新）
2. roles.json を upsert（classification + name が一致する場合は更新）
3. role_eval_mappings.json を upsert
4. allocations.json を upsert（fiscal_year + division + eval_uid で一意）
```

実行コマンド：
```bash
npx prisma db seed
```

---

## 判定基準の変更手順

1. `prisma/seeds/role_eval_mappings.json` を編集
2. `npx prisma db seed` を実行
3. `role_members` テーブルの再計算 API を叩く（または自動で再計算）

### 変更例：「server side engineer」の評価項目 2-3-2 を 可以上→良以上 に引き上げ

```json
// 変更前
{ "role_name": "server side engineer", "eval_uid": "2-3-2", "necessity": "half", "required_level": "ka" }

// 変更後
{ "role_name": "server side engineer", "eval_uid": "2-3-2", "necessity": "half", "required_level": "ryo" }
```

### 変更例：新しい評価項目をロールに追加

```json
// 追記するだけ
{ "role_name": "server side engineer", "eval_uid": "5-1-1", "necessity": "half", "required_level": "ka" }
```

---

## 初期データ投入の流れ（Excel → JSON）

1. Excel の各シートをもとに JSON を手作成
2. `evaluation_items.json`：`evaluation` シートの UID・評価項目名・説明を転記
3. `roles.json`：`role` シートのロール定義を転記
4. `role_eval_mappings.json`：`role-evaluation-Mapping` シートの ○/△・必要スコアを転記
5. `allocations.json`：`Allocation` シートの配点を転記
