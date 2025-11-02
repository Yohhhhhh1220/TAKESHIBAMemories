const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// PostgreSQLデータベース初期化
const { initializeDatabase } = require('./services/postgresService');

const app = express();

// ミドルウェア設定
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ルート設定
// Vercel環境では静的ファイルは自動的に配信されるが、
// 動的ルート（/survey/:locationId など）でHTMLを返す必要がある
app.get('/', (req, res) => {
  const htmlPath = path.resolve(process.cwd(), 'public', 'index.html');
  res.sendFile(htmlPath);
});

// アンケートページ
app.get('/survey/:locationId', (req, res) => {
  const htmlPath = path.resolve(process.cwd(), 'public', 'survey.html');
  res.sendFile(htmlPath);
});

// 俳句表示ページ
app.get('/haiku/:id', (req, res) => {
  const htmlPath = path.resolve(process.cwd(), 'public', 'haiku.html');
  res.sendFile(htmlPath);
});

// 管理者ダッシュボード
app.get('/admin', (req, res) => {
  const htmlPath = path.resolve(process.cwd(), 'public', 'admin.html');
  res.sendFile(htmlPath);
});

// QRコード一覧ページ
app.get('/qr-codes', (req, res) => {
  const htmlPath = path.resolve(process.cwd(), 'public', 'qr-codes.html');
  res.sendFile(htmlPath);
});

// API ルート
app.use('/api', require('./routes/api'));
app.use('/api/admin', require('./routes/admin'));

// データベース初期化（非同期で実行、エラーはログに記録するだけ）
initializeDatabase()
  .then(() => {
    console.log('データベース初期化完了');
  })
  .catch((error) => {
    console.error('データベース初期化エラー:', error);
    console.error('エラーの詳細:', error.message);
    // 初期化に失敗しても続行（リクエスト時に再試行される）
  });

// エラーハンドリング（ルートの後に配置）
app.use((err, req, res, next) => {
  console.error('サーバーエラー:', err);
  res.status(500).json({
    error: 'サーバーエラーが発生しました',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Vercel向けにエクスポート（サーバーレス関数として動作）
module.exports = app;

// ローカル開発環境でのみ server.listen() を実行
// Vercel環境では実行されない
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV && !process.env.VERCEL) {
  const http = require('http');
  const PORT = process.env.PORT || 3000;
  const server = http.createServer(app);
  
  // Socket.IO設定（ローカル開発環境のみ）
  const socketIo = require('socket.io');
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  io.on('connection', (socket) => {
    console.log('ユーザーが接続しました:', socket.id);
    
    socket.on('join-location', (locationId) => {
      socket.join(`location-${locationId}`);
      console.log(`ユーザー ${socket.id} が場所 ${locationId} に参加しました`);
    });
    
    socket.on('disconnect', () => {
      console.log('ユーザーが切断しました:', socket.id);
    });
  });
  
  app.set('io', io);
  
  server.listen(PORT, () => {
    console.log(`サーバーがポート ${PORT} で起動しました`);
    console.log(`TAKESHIBA Memories が稼働中です`);
  });
}
