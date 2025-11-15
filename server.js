const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 環境変数の検証（警告のみ、起動は続行）
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  警告: OPENAI_API_KEYが設定されていません');
  console.warn('   川柳生成機能が正常に動作しない可能性があります');
} else {
  const key = String(process.env.OPENAI_API_KEY).trim();
  if (!key || key.length < 20) {
    console.warn('⚠️  警告: OPENAI_API_KEYが無効な可能性があります');
  } else {
    console.log('✓ OPENAI_API_KEYが設定されています');
  }
}

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
    } else if (ext === '.svg') {
      contentType = 'image/svg+xml';
      const svg = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', contentType);
      return res.send(svg);
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

// ルート設定（express.staticより前に配置）
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

// ディスプレイページ（縦長ディスプレイ用）- express.staticより前に配置
app.get('/display', (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'public', 'display.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error reading display.html:', error);
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

// 川柳表示ページ
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

// フォールバック：express.static（ルートの後に配置）
app.use(express.static('public'));


// API ルート（エラーハンドリング付き）
let apiRoutesLoaded = false;
try {
  console.log('🔄 API routes を読み込み中...');
  const apiRoutes = require('./routes/api');
  app.use('/api', apiRoutes);
  apiRoutesLoaded = true;
  console.log('✅ API routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading /api routes:', error);
  console.error('Error details:', error.message);
  console.error('Error stack:', error.stack);
  console.error('Error name:', error.name);
  
  // より詳細なエラーハンドリング
  app.use('/api', (req, res, next) => {
    console.error('API route called but routes unavailable:', req.method, req.path);
    res.status(500).json({ 
      error: 'API routes unavailable',
      message: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      details: {
        name: error.name,
        message: error.message,
        code: error.code
      }
    });
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
  const os = require('os');
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
  
  // ローカルIPアドレスを取得する関数
  function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // IPv4で、内部（非ループバック）アドレスを探す
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }
  
  server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();
    console.log(`サーバーがポート ${PORT} で起動しました`);
    console.log(`TAKESHIBA Memories が稼働中です`);
    console.log(`\n📱 スマートフォンからアクセス:`);
    console.log(`   ローカル: http://localhost:${PORT}`);
    console.log(`   ネットワーク: http://${localIP}:${PORT}`);
    console.log(`\n💡 スマートフォンとPCを同じWi-Fiに接続してください\n`);
  });
}
