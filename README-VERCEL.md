# TAKESHIBA Memories - Vercel デプロイガイド

## 🚀 Vercel へのデプロイ手順

### 1. 前提条件
- Vercelアカウント
- GitHubリポジトリ
- OpenAI APIキー

### 2. 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定してください：

```
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
```

### 3. PostgreSQL データベースの設定

1. Vercelダッシュボードでプロジェクトを開く
2. 「Storage」タブをクリック
3. 「Create Database」→「PostgreSQL」を選択
4. データベース名を入力して作成
5. 接続情報が自動的に環境変数に設定されます

### 4. デプロイ

1. GitHubリポジトリをVercelに接続
2. プロジェクト設定で以下を確認：
   - **Framework Preset**: Other
   - **Build Command**: `npm install && npm run vercel-build`
   - **Output Directory**: 空白
   - **Install Command**: `npm install`
3. **重要**: 初回デプロイ前に「Redeploy」を実行してキャッシュをクリア

### 5. カスタムドメイン（オプション）

1. Vercelダッシュボードで「Domains」タブを開く
2. カスタムドメインを追加
3. DNS設定を更新

## 📁 ファイル構成

```
├── server.js              # メインサーバーファイル
├── vercel.json           # Vercel設定ファイル
├── package.json          # 依存関係とスクリプト
├── services/
│   ├── postgresService.js # PostgreSQLデータベースサービス
│   ├── haikuService.js    # 川柳生成サービス
│   └── qrService.js       # QRコード生成サービス
├── routes/
│   ├── api.js            # APIルート
│   └── admin.js          # 管理者ルート
└── public/               # 静的ファイル
    ├── index.html
    ├── admin.html
    ├── qr-codes.html
    ├── app.js
    └── styles.css
```

## 🔧 技術スタック

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (@vercel/postgres)
- **AI**: OpenAI GPT-4
- **QR Code**: qrcode
- **Real-time**: Socket.IO
- **Deployment**: Vercel

## 📊 機能

### ユーザー機能
- QRコードスキャンでアクセス
- 感情選択（16種類）
- 川柳自動生成
- 川柳共有機能
- リアルタイム川柳表示

### 管理者機能
- 感情選択統計表示
- QRコード生成・管理
- リアルタイム監視

## 🌐 アクセスURL

デプロイ後、以下のURLでアクセス可能：

- **メインサイト**: `https://your-project.vercel.app`
- **管理者ダッシュボード**: `https://your-project.vercel.app/admin`
- **QRコード一覧**: `https://your-project.vercel.app/qr-codes`

## 🔍 トラブルシューティング

### よくある問題

1. **SQLite3 モジュールエラー**
   - Vercelダッシュボードで「Redeploy」を実行
   - プロジェクト設定で「Clear Cache」を有効化
   - ローカルで `npm run clean` を実行してから再デプロイ

2. **データベース接続エラー**
   - VercelダッシュボードでPostgreSQLが正しく設定されているか確認
   - 環境変数が正しく設定されているか確認

3. **OpenAI API エラー**
   - APIキーが正しく設定されているか確認
   - クレジット残高を確認

4. **QRコード生成エラー**
   - ファイル書き込み権限を確認
   - ストレージ容量を確認

### ログの確認

Vercelダッシュボードの「Functions」タブでログを確認できます。

## 📱 モバイル対応

- レスポンシブデザイン
- タッチフレンドリーなUI
- QRコードスキャン対応

## 🔒 セキュリティ

- CORS設定済み
- 環境変数による機密情報管理
- SQLインジェクション対策済み

## 📈 パフォーマンス

- Vercel Edge Network
- 自動スケーリング
- CDN配信

## 🆘 サポート

問題が発生した場合は、以下を確認してください：

1. Vercelダッシュボードのログ
2. 環境変数の設定
3. データベース接続状態
4. APIキーの有効性

---

**慶應義塾大学大学院メディアデザイン研究科**  
**MeLIGHT Project**
