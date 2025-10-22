const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// PostgreSQLデータベース初期化
const { initializeDatabase } = require('./services/postgresService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ミドルウェア設定
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ルート設定
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// アンケートページ
app.get('/survey/:locationId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'survey.html'));
});

// 俳句表示ページ
app.get('/haiku/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'haiku.html'));
});

// 管理者ダッシュボード
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// QRコード一覧ページ
app.get('/qr-codes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qr-codes.html'));
});

// API ルート
app.use('/api', require('./routes/api'));
app.use('/api/admin', require('./routes/admin'));

// Socket.IO接続処理
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

// グローバルにioを利用可能にする
app.set('io', io);

// データベース初期化
initializeDatabase().catch(console.error);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバーがポート ${PORT} で起動しました`);
  console.log(`TAKESHIBA Memories が稼働中です`);
});
