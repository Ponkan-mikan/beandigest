# World's Best Coffee – A Curated Guide

世界中の訪れるべきコーヒーロースタリー・カフェのキュレーションサイトです。

## データソース

| 評価機関 | 対象年度 | ステータス |
|---------|---------|-----------|
| [The World's 100 Best Coffee Shops](https://theworlds100bestcoffeeshops.com/) | 2026 | ✅ 収録済み（100件） |
| [Global Coffee Awards (GCA)](https://globalcoffeeawards.com/) – World決勝・欧州・北米 & Canada・Origin Gold以上 | 2025–2026 | ✅ 収録済み（約60件） |
| [Roast Magazine – Roaster of the Year](https://roastmagazine.com/) – Micro・Macro両カテゴリー | 2021–2026 | ✅ 収録済み（11件） |
| [Roastful Top 100](https://roastful.com/) | 2024 | ✅ 収録済み（100件中、DB既存分は受賞情報を追記） |

> **総収録数**: 約 240 件（評価機関をまたいで重複するショップは1エントリーで複数の受賞情報を保持）

---

## セットアップ

### 1. ローカルで確認する

`index.html` をブラウザで直接開くと `fetch()` がCORSエラーになります。  
以下のいずれかのローカルサーバーを使ってください：

```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve .

# VS Code
"Live Server" 拡張機能を使用
```

起動後、ブラウザで `http://localhost:8000` を開いてください。

---

### 2. Google Maps を有効にする

#### APIキーの取得

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のものを選択）
3. 左メニュー「APIとサービス」→「ライブラリ」から **Maps JavaScript API** を有効化
4. 「認証情報」→「認証情報を作成」→「APIキー」でキーを取得
5. セキュリティのため、HTTPリファラー制限を設定（例：`yourusername.github.io/*`）

> **費用**: 毎月$200の無料枠あり。月間28,000回マップ読み込みまで無料。

#### APIキーの設定

`script.js` の先頭を編集：

```js
// Before
const GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY_HERE';

// After
const GOOGLE_MAPS_API_KEY = 'AIzaSy...あなたのキー...';
```

---

### 3. GitHub Pages で公開する

1. GitHubで新しいリポジトリを作成（例：`worlds-best-coffee`）
2. ファイルをプッシュ：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/worlds-best-coffee.git
   git push -u origin main
   ```
3. GitHubリポジトリの Settings → Pages → Branch: `main` / `/ (root)` → Save
4. 数分後に `https://yourusername.github.io/worlds-best-coffee/` で公開

---

## データの更新・追加

### 新しいショップを追加する

`data/roasters.json` の `entries` 配列に追記します：

```json
{
  "id":      "unique-kebab-case-id",
  "name":    "Shop Name",
  "city":    "City",
  "country": "Country Name",
  "cc":      "XX",
  "lat":     35.6762,
  "lng":     139.6503,
  "url":     "https://example.com",
  "awards":  [
    { "org": "worlds-100-best", "year": 2026, "rank": 1 }
  ]
}
```

**フィールド説明:**

| フィールド | 内容 |
|-----------|------|
| `id` | ユニークなID（英数字・ハイフンのみ） |
| `name` | 店名 |
| `city` | 都市名（空文字でもOK） |
| `country` | 国名（フィルターに使用） |
| `cc` | ISO 3166-1 alpha-2 国コード（国旗絵文字に使用） |
| `lat` / `lng` | 緯度・経度（Google Mapsピン位置） |
| `url` | 公式サイトURL（なければ空文字） |
| `awards` | 受賞情報の配列 |

**`awards` の各オブジェクト:**

| フィールド | 内容 |
|-----------|------|
| `org` | 評価機関ID（`organizations` に定義されたもの） |
| `year` | 受賞年（数値） |
| `rank` | 順位（数値、なければ省略） |
| `category` | カテゴリー名（任意） |

### 新しい評価機関を追加する

`data/roasters.json` の `organizations` 配列に追記：

```json
{
  "id":        "new-org-id",
  "name":      "Full Organization Name",
  "shortName": "Short Name",
  "url":       "https://org-website.com",
  "color":     "#HEX色コード"
}
```

その後、その機関の受賞者エントリーを `entries` に追加するだけで、フィルターに自動反映されます。

---

## ファイル構成

```
/
├── index.html          メインHTML
├── style.css           スタイルシート
├── script.js           フィルター・マップロジック
├── data/
│   └── roasters.json   全ショップデータ
└── README.md           このファイル
```

---

## 今後の拡張アイデア

- [ ] GCA / Roast Magazine / Roastful のデータ収録
- [ ] 各ショップの詳細ページ
- [ ] 「行きたいリスト」ブックマーク機能
- [ ] ルート計画機能（旅行時に複数店をまとめて表示）
- [ ] 言語切替（日本語 / 英語）
