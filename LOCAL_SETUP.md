# ローカル環境での確認方法

このサイトを変更した際にローカルで確認する手順です。

## 前提条件

- Node.js がインストールされていること
- npm が利用可能であること

## セットアップ手順

### 1. 依存パッケージのインストール

初回のみ、または `package.json` が変更された場合に実行：

```bash
npm install
```

### 2. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成（まだない場合）：

```bash
# Windows PowerShell
Copy-Item env.example .env

# または手動で .env ファイルを作成
```

`.env` ファイルを開いて、以下を設定：

```env
# OpenAI API設定（必須）
OPENAI_API_KEY=your_openai_api_key_here

# サーバー設定
PORT=3000
NODE_ENV=development

# QRコード設定
QR_BASE_URL=http://localhost:3000
```

**重要**: `your_openai_api_key_here` を実際のOpenAI APIキーに置き換えてください。

### 3. サーバーの起動

#### 開発モード（推奨）
ファイル変更を自動検知して再起動します：

```bash
npm run dev
```

#### 本番モード
通常の起動：

```bash
npm start
```

### 4. ブラウザで確認

サーバー起動後、以下のURLにアクセス：

- **メインページ**: http://localhost:3000
- **アンケートページ**: http://localhost:3000/survey/:locationId
  - 例: http://localhost:3000/survey/takeshiba-station
- **川柳表示ページ**: http://localhost:3000/haiku/:id
- **ディスプレイページ**: http://localhost:3000/display

## よくある操作

### サーバーの停止

ターミナルで `Ctrl + C` を押す

### ポートが使用中の場合

別のポートを使用する場合、`.env` ファイルで変更：

```env
PORT=3001
```

または環境変数として直接指定：

```bash
# Windows PowerShell
$env:PORT=3001; npm run dev
```

## トラブルシューティング

### ポートが既に使用されている

```
Error: listen EADDRINUSE: address already in use :::3000
```

**解決方法**: 
- 他のアプリケーションがポート3000を使用していないか確認
- `.env` で別のポートを指定

### モジュールが見つからない

```
Error: Cannot find module 'xxx'
```

**解決方法**: 
```bash
npm install
```

### OPENAI_API_KEY エラー

```
❌ OPENAI_API_KEYが設定されていません
```

**解決方法**:
1. `.env` ファイルがプロジェクトルートにあるか確認
2. `.env` ファイルに正しいAPIキーが設定されているか確認
3. サーバーを再起動

## 開発のヒント

- `npm run dev` を使用すると、ファイルを変更すると自動的にサーバーが再起動されます
- ブラウザの開発者ツール（F12）でコンソールエラーを確認できます
- サーバーのログはターミナルに表示されます

## テストコマンド

特定の機能をテストする場合：

```bash
# 川柳生成機能のテスト
npm run test:haiku

# OpenAIモデルのテスト
npm run test:models

# API接続のテスト
npm run test:api
```

