const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// PostgreSQLデータベース初期化（遅延読み込み）
let initializeDatabase;
try {
  const postgresService = require('./services/postgresService');
  initializeDatabase = postgresService.initializeDatabase;
} catch (error) {
  console.error('Error loading postgresService:', error);
  initializeDatabase = async () => {
    console.warn('Database initialization skipped');
  };
}

const app = express();

// ミドルウェア設定
app.use(cors());
app.use(express.json());

// 静的ファイルの配信（他のルートより前に配置）
app.get(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/, (req, res) => {
  try {
    const filePath = path.join(__dirname, 'public', req.path);
    const ext = path.extname(req.path);
    let contentType = 'application/octet-stream';
    
    if (ext === '.css') {
      contentType = 'text/css';
      const css = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', contentType);
      return res.send(css);
    } else if (ext === '.js') {
      contentType = 'application/javascript';
      const js = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', contentType);
      return res.send(js);
    } else {
      // 画像などのバイナリファイル
      const file = fs.readFileSync(filePath);
      res.setHeader('Content-Type', contentType);
      return res.send(file);
    }
  } catch (error) {
    console.error('Error reading static file:', req.path, error);
    res.status(404).send('File not found');
  }
});

// フォールバック：express.static
app.use(express.static('public'));

// ルート設定
// Vercel環境では静的ファイルは自動的に配信されるが、
// 動的ルート（/survey/:locationId など）でHTMLを返す必要がある
app.get('/', (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error reading index.html:', error);
    res.status(500).send('Error loading page');
  }
});

// アンケートページ
app.get('/survey/:locationId', (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'public', 'survey.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error reading survey.html:', error);
    res.status(500).send('Error loading page');
  }
});

// 俳句表示ページ
app.get('/haiku/:id', (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'public', 'haiku.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error reading haiku.html:', error);
    res.status(500).send('Error loading page');
  }
});

// 管理者ダッシュボード
app.get('/admin', (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'public', 'admin.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error reading admin.html:', error);
    res.status(500).send('Error loading page');
  }
});

// QRコード一覧ページ
app.get('/qr-codes', (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'public', 'qr-codes.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error reading qr-codes.html:', error);
    res.status(500).send('Error loading page');
  }
});

// API ルート（エラーハンドリング付き）
try {
  app.use('/api', require('./routes/api'));
} catch (error) {
  console.error('Error loading /api routes:', error);
  app.use('/api', (req, res) => {
    res.status(500).json({ error: 'API routes unavailable' });
  });
}

try {
  app.use('/api/admin', require('./routes/admin'));
} catch (error) {
  console.error('Error loading /api/admin routes:', error);
  app.use('/api/admin', (req, res) => {
    res.status(500).json({ error: 'Admin routes unavailable' });
  });
}

// データベース初期化（非同期で実行、エラーはログに記録するだけ）
// Vercel環境ではリクエスト時に初期化される
try {
  initializeDatabase()
    .then(() => {
      console.log('データベース初期化完了');
    })
    .catch((error) => {
      console.error('データベース初期化エラー:', error);
      console.error('エラーの詳細:', error.message);
      // 初期化に失敗しても続行（リクエスト時に再試行される）
    });
} catch (error) {
  console.error('データベース初期化関数の呼び出しエラー:', error);
}

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
