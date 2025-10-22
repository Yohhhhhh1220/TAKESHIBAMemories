# 竹芝俳句音楽システム

慶應義塾大学大学院メディアデザイン研究科の研究プロジェクト「竹芝エリアの sense of place 向上システム」です。

## 概要

竹芝エリアに設置されたQRコードをスキャンしてアンケートに回答すると、AIが俳句を生成し、その俳句に基づいた音楽をリアルタイムで生成・再生するシステムです。これにより、その場所への再帰性を高め、sense of placeを向上させることを目標としています。

## 機能

- **QRコードアンケート**: 竹芝エリア各所に設置されたQRコードからアンケートにアクセス
- **AI俳句生成**: ChatGPT APIを使用してユーザーの回答に基づいた俳句を生成
- **リアルタイム音楽生成**: Google MusicFX APIを使用して俳句に応じた音楽を生成
- **音楽ストリーミング**: 生成された音楽をBGMとして継続的に再生
- **リアルタイム配信**: Socket.IOを使用したリアルタイム俳句・音楽配信

## 技術スタック

- **バックエンド**: Node.js, Express.js
- **データベース**: PostgreSQL (@vercel/postgres)
- **リアルタイム通信**: Socket.IO
- **AI API**: OpenAI ChatGPT API
- **音楽生成**: Google MusicFX API
- **フロントエンド**: HTML5, CSS3, JavaScript (Vanilla)

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`env.example`をコピーして`.env`ファイルを作成し、必要なAPIキーを設定してください。

```bash
cp env.example .env
```

`.env`ファイルに以下を設定：

```env
# OpenAI API設定
OPENAI_API_KEY=your_openai_api_key_here

# Google MusicFX API設定
GOOGLE_MUSIC_API_KEY=your_google_music_api_key_here

# サーバー設定
PORT=3000
NODE_ENV=development

# データベース設定
DB_PATH=./database/survey.db

# QRコード設定
QR_BASE_URL=http://localhost:3000
```

### 3. データベースの初期化

```bash
node scripts/init-locations.js
```

### 4. サーバーの起動

```bash
# 開発モード
npm run dev

# 本番モード
npm start
```

## API エンドポイント

### 一般API

- `POST /api/survey` - アンケート送信
- `GET /api/haiku/:id` - 俳句取得
- `GET /api/location/:locationId/haikus` - 場所別俳句一覧

### 管理API

- `POST /api/admin/qr/generate` - QRコード生成
- `POST /api/admin/qr/generate-multiple` - 複数QRコード一括生成
- `GET /api/admin/qr/list` - QRコード一覧
- `DELETE /api/admin/qr/:locationId` - QRコード削除
- `GET /api/admin/music/streams` - 音楽ストリーム情報
- `POST /api/admin/music/stop/:locationId` - 音楽ストリーム停止
- `POST /api/admin/music/stop-all` - 全音楽ストリーム停止

## 使用方法

### 1. QRコードの生成

管理APIを使用してQRコードを生成：

```bash
curl -X POST http://localhost:3000/api/admin/qr/generate \
  -H "Content-Type: application/json" \
  -d '{"locationId": "takeshiba-station", "locationName": "竹芝駅"}'
```

### 2. アンケートの回答

1. QRコードをスキャンしてアンケートページにアクセス
2. 質問に回答
3. 生成された俳句と音楽を確認

### 3. 音楽ストリームの管理

音楽ストリームの状態を確認：

```bash
curl http://localhost:3000/api/admin/music/streams
```

## プロジェクト構造

```
├── public/                 # フロントエンドファイル
│   ├── index.html         # メインページ
│   ├── survey.html        # アンケートページ
│   ├── haiku.html         # 俳句表示ページ
│   ├── styles.css         # スタイルシート
│   ├── app.js             # メインJavaScript
│   ├── survey.js          # アンケートJavaScript
│   └── haiku.js           # 俳句表示JavaScript
├── routes/                # APIルート
│   ├── api.js             # 一般API
│   └── admin.js           # 管理API
├── services/              # サービス層
│   ├── haikuService.js    # 俳句生成サービス
│   ├── musicService.js    # 音楽生成サービス
│   ├── musicStreamService.js # 音楽ストリームサービス
│   ├── databaseService.js # データベースサービス
│   └── qrService.js       # QRコードサービス
├── scripts/               # スクリプト
│   └── init-locations.js  # 初期化スクリプト
├── database/              # データベースファイル
├── server.js              # メインサーバーファイル
└── package.json           # 依存関係
```

## 研究の意義

このシステムは以下の研究目標を達成することを目指しています：

1. **場所の再帰性向上**: ユーザーの体験が俳句と音楽として記録・共有されることで、その場所への愛着を高める
2. **Sense of Place の向上**: その場所特有の体験をAIが芸術作品として昇華し、場所の魅力を再発見する
3. **コミュニティ形成**: リアルタイムでの俳句・音楽共有により、その場所を訪れる人々の間のつながりを生み出す

## ライセンス

MIT License

## 貢献

このプロジェクトは研究目的で開発されています。貢献やフィードバックは歓迎します。

## 連絡先

慶應義塾大学大学院メディアデザイン研究科
