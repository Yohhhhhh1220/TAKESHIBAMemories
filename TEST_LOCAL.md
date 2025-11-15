# ローカル環境でのAIテスト方法

## セットアップ手順

### 1. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下の内容を追加してください：

```env
# OpenAI API設定（必須）
OPENAI_API_KEY=your_openai_api_key_here

# サーバー設定
PORT=3000
NODE_ENV=development

# データベース設定（オプション、Neonを使用する場合）
POSTGRES_URL=postgresql://username:password@host:port/database?sslmode=require
```

**重要**: `your_openai_api_key_here` の部分を実際のOpenAI APIキーに置き換えてください。

### 2. 依存パッケージのインストール

```bash
npm install
```

## テスト方法

### 方法1: 川柳生成機能を直接テスト

川柳生成AIが正しく動作するかテストします：

```bash
npm run test:haiku
```

このコマンドは：
- アンケート回答のサンプルデータを使用
- 実際の川柳生成を実行
- 結果をコンソールに表示

### 方法2: 利用可能なモデルをテスト

すべてのOpenAIモデルとAPI（Responses API / Chat Completions API）をテストします：

```bash
npm run test:models
```

このコマンドは：
- `gpt-4o-mini`, `gpt-4o`, `o1-mini`, `o1-preview` をテスト
- Responses APIとChat Completions APIの両方をテスト
- 各モデルの利用可否を確認
- 結果サマリーを表示

### 方法3: 基本的なAPI接続テスト

```bash
npm run test:api
```

このコマンドは：
- OpenAI APIへの接続をテスト
- APIキーが正しく設定されているか確認

### 方法4: ローカルサーバーを起動してブラウザでテスト

1. ローカルサーバーを起動：

```bash
npm run dev
```

または

```bash
npm start
```

2. ブラウザで以下のURLにアクセス：

```
http://localhost:3000
```

3. 実際のフォームを使用して川柳を生成

## トラブルシューティング

### OPENAI_API_KEYが設定されていないエラー

```
❌ OPENAI_API_KEYが設定されていません
```

**解決方法**:
1. `.env` ファイルがプロジェクトルートにあるか確認
2. `.env` ファイルに `OPENAI_API_KEY=your_actual_key` が記述されているか確認
3. APIキーの前後に余分な空白がないか確認

### モデルアクセス権限エラー

```
❌ PermissionDeniedError: 403 Project does not have access to model
```

**解決方法**:
1. [OpenAI Platform](https://platform.openai.com/) にログイン
2. Settings > Organization でモデルのアクセス権限を確認
3. 必要に応じて、利用可能なモデルに変更

### ネットワークエラー

```
❌ ネットワークエラー
```

**解決方法**:
1. インターネット接続を確認
2. ファイアウォールやプロキシ設定を確認
3. VPNを使用している場合は、一時的に無効にして再試行

## テストスクリプトの詳細

### test-haiku-ai.js
- 実際の川柳生成機能をテスト
- サンプルアンケート回答を使用
- 生成された川柳を表示

### test-openai-models.js
- 複数のモデルとAPIをテスト
- 各モデルの利用可否を確認
- 詳細なエラー情報を表示

### test-api.js
- 基本的なAPI接続テスト
- APIキーの検証

## 注意事項

- テスト実行時はAPI使用量が発生します
- レート制限に達した場合は、しばらく待ってから再試行してください
- 本番環境（Vercel）の環境変数とは別に、ローカル用の `.env` ファイルが必要です


















