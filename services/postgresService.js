// pgパッケージの読み込みをエラーハンドリング付きで行う
let Pool;
let pgAvailable = false;
try {
  Pool = require('pg').Pool;
  pgAvailable = true;
  console.log('✅ pg パッケージが読み込まれました');
} catch (error) {
  console.error('❌ pg パッケージの読み込みエラー:', error);
  console.warn('⚠️  pg パッケージが見つかりません。データベース機能は無効化されます。');
  console.warn('⚠️  アプリケーションは動作を続けますが、データベース機能は利用できません。');
  // エラーをスローせず、pgAvailable = falseのまま続行
  pgAvailable = false;
}

// データベース接続プール
let pool = null;
let isInitialized = false;
let initializationPromise = null;

/**
 * データベース接続プールを取得または作成
 */
function getPool() {
  // pgパッケージが利用できない場合はエラーをスロー
  if (!pgAvailable) {
    throw new Error('pg パッケージが利用できません。データベース機能は無効化されています。');
  }
  
  if (!pool) {
    try {
      // 接続文字列を取得（優先順位: POSTGRES_URL > DATABASE_URL > 個別設定）
      const connectionString = 
        process.env.POSTGRES_URL || 
        process.env.DATABASE_URL || 
        (process.env.PGHOST ? 
          `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD}@${process.env.PGHOST}/${process.env.PGDATABASE || 'postgres'}${process.env.PGPORT ? `:${process.env.PGPORT}` : ''}${(process.env.POSTGRES_URL && process.env.POSTGRES_URL.includes('sslmode')) || process.env.PGHOST?.includes('neon.tech') ? '?sslmode=require' : ''}` : 
          null);

      if (!connectionString) {
        const errorMsg = 'データベース接続文字列が見つかりません。POSTGRES_URLまたはDATABASE_URLを設定してください。';
        console.error('❌', errorMsg);
        console.error('環境変数確認:');
        console.error('  POSTGRES_URL:', process.env.POSTGRES_URL ? '設定済み' : '未設定');
        console.error('  DATABASE_URL:', process.env.DATABASE_URL ? '設定済み' : '未設定');
        console.error('  PGHOST:', process.env.PGHOST ? '設定済み' : '未設定');
        throw new Error(errorMsg);
      }

      console.log('🗄️  データベース接続プールを作成中...');
      console.log('接続先:', connectionString.replace(/:[^:@]+@/, ':****@')); // パスワードをマスク

      pool = new Pool({
        connectionString: connectionString,
        ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') ? {
          rejectUnauthorized: false
        } : false,
        max: 20, // 最大接続数
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // 接続エラーの処理
      pool.on('error', (err) => {
        console.error('❌ 予期しないデータベース接続エラー:', err);
        pool = null; // プールをリセット
      });
      
      console.log('✅ データベース接続プールを作成しました');
    } catch (error) {
      console.error('❌ データベース接続プール作成エラー:', error);
      console.error('エラーの詳細:', error.message);
      throw error;
    }
  }

  return pool;
}

/**
 * SQLクエリを実行
 */
async function query(text, params) {
  // pgパッケージが利用できない場合はエラーをスロー
  if (!pgAvailable) {
    throw new Error('pg パッケージが利用できません。データベース機能は無効化されています。');
  }
  
  try {
    const client = getPool();
    if (!client) {
      throw new Error('データベース接続プールが利用できません');
    }
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('SQLクエリエラー:', error);
    console.error('クエリ:', text);
    console.error('パラメータ:', params);
    throw error;
  }
}

/**
 * データベーステーブルを初期化
 */
async function initializeDatabase() {
  // pgパッケージが利用できない場合は何もしない
  if (!pgAvailable) {
    console.warn('⚠️  pg パッケージが利用できないため、データベース初期化をスキップします。');
    return;
  }
  
  // 既に初期化済みの場合はスキップ
  if (isInitialized) {
    return;
  }
  
  // 既に初期化中の場合、そのPromiseを返す
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = (async () => {
    try {
      console.log('🗄️  データベース初期化を開始します...');
      
      // アンケートテーブル
      await query(`
        CREATE TABLE IF NOT EXISTS surveys (
          id SERIAL PRIMARY KEY,
          location_id VARCHAR(50) NOT NULL,
          purpose VARCHAR(50),
          mood VARCHAR(50),
          reason TEXT,
          penname VARCHAR(50),
          qr_code_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // 既存のテーブルにpennameカラムを追加（存在しない場合）
      try {
        await query(`
          ALTER TABLE surveys 
          ADD COLUMN IF NOT EXISTS penname VARCHAR(50)
        `);
      } catch (alterError) {
        // カラムが既に存在する場合は無視
        if (!alterError.message.includes('already exists') && !alterError.message.includes('duplicate column')) {
          console.warn('⚠️  pennameカラム追加時の警告:', alterError.message);
        }
      }
      
      // 俳句テーブル
      await query(`
        CREATE TABLE IF NOT EXISTS haikus (
          id SERIAL PRIMARY KEY,
          survey_id INTEGER,
          haiku_text TEXT NOT NULL,
          mood_category VARCHAR(50),
          season_category VARCHAR(50),
          location_category VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (survey_id) REFERENCES surveys (id) ON DELETE CASCADE
        )
      `);
      
      // 感情選択統計テーブル
      await query(`
        CREATE TABLE IF NOT EXISTS mood_stats (
          id SERIAL PRIMARY KEY,
          mood VARCHAR(50) NOT NULL UNIQUE,
          count INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      isInitialized = true;
      console.log('✅ PostgreSQLデータベーステーブルを初期化しました');
    } catch (error) {
      console.error('❌ データベース初期化エラー:', error);
      console.error('エラーの詳細:', error.message);
      console.error('エラーのスタック:', error.stack);
      
      // エラーが発生しても、テーブルが既に存在する可能性があるため、初期化済みとしてマーク
      if (error.message && (
        error.message.includes('already exists') ||
        error.message.includes('duplicate key')
      )) {
        console.warn('⚠️  テーブルは既に存在するようです');
        isInitialized = true;
      } else {
        // 重大なエラーの場合のみ再スロー
        initializationPromise = null;
        throw error;
      }
    }
  })();
  
  return initializationPromise;
}

/**
 * アンケートデータを保存
 * @param {string} locationId - 場所ID
 * @param {Object} answers - アンケート回答
 * @returns {Promise<number>} 保存されたアンケートID
 */
async function saveSurvey(locationId, answers) {
  try {
    // データベースが初期化されていることを確認
    if (!isInitialized) {
      await initializeDatabase();
    }
    
    const penname = answers.penname || '詠み人知らず';
    
    const result = await query(
      `INSERT INTO surveys (location_id, purpose, mood, reason, penname)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [locationId, answers.purpose, answers.mood, answers.reason, penname]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('アンケート保存エラー:', error);
    console.error('エラーの詳細:', error.message);
    throw error;
  }
}

/**
 * アンケートデータを取得
 * @param {number} surveyId - アンケートID
 * @returns {Promise<Object>} アンケートデータ
 */
async function getSurvey(surveyId) {
  try {
    const result = await query(
      `SELECT * FROM surveys WHERE id = $1`,
      [surveyId]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('アンケート取得エラー:', error);
    throw error;
  }
}

/**
 * アンケートに俳句を更新
 * @param {number} surveyId - アンケートID
 * @param {string} haiku - 俳句テキスト
 * @param {string} musicUrl - 音楽URL
 */
async function updateSurveyWithHaiku(surveyId, haiku, musicUrl) {
  try {
    // データベースが初期化されていることを確認
    if (!isInitialized) {
      await initializeDatabase();
    }
    
    // 俳句テーブルに保存
    await query(
      `INSERT INTO haikus (survey_id, haiku_text)
       VALUES ($1, $2)`,
      [surveyId, haiku]
    );
    
    console.log(`✅ 俳句をデータベースに保存しました: ${haiku}`);
  } catch (error) {
    console.error('俳句保存エラー:', error);
    console.error('エラーの詳細:', error.message);
    throw error;
  }
}

/**
 * 場所別俳句を取得
 * @param {string} locationId - 場所ID
 * @returns {Promise<Array>} 俳句リスト
 */
async function getHaikusByLocation(locationId) {
  try {
    const result = await query(
      `SELECT DISTINCT h.haiku_text as haiku, s.location_id, s.penname, h.created_at, h.id
       FROM haikus h
       JOIN surveys s ON h.survey_id = s.id
       WHERE s.location_id = $1
       ORDER BY h.created_at DESC`,
      [locationId]
    );
    
    return result.rows || [];
  } catch (error) {
    console.error('場所別俳句取得エラー:', error);
    throw error;
  }
}

/**
 * 全俳句を取得
 * @returns {Promise<Array>} 俳句リスト
 */
async function getAllHaikus() {
  // pgパッケージが利用できない場合は空配列を返す
  if (!pgAvailable) {
    console.warn('⚠️  pg パッケージが利用できないため、空配列を返します。');
    return [];
  }
  
  try {
    // データベースが初期化されていることを確認
    if (!isInitialized) {
      console.log('データベースが初期化されていないため、初期化を実行します...');
      try {
        await initializeDatabase();
      } catch (initError) {
        console.warn('データベース初期化エラー（続行します）:', initError.message);
        // 初期化エラーでも続行（空配列を返す）
      }
    }
    
    console.log('全俳句を取得中...');
    const result = await query(
      `SELECT DISTINCT h.haiku_text as haiku, s.location_id, s.penname, h.created_at, h.id
       FROM haikus h
       JOIN surveys s ON h.survey_id = s.id
       ORDER BY h.created_at DESC`
    );
    
    const haikus = result.rows || [];
    console.log(`取得した俳句数: ${haikus.length}件`);
    
    return haikus;
  } catch (error) {
    console.error('全俳句取得エラー:', error);
    console.error('エラーの詳細:', error.message);
    console.error('エラーのスタック:', error.stack);
    
    // すべてのエラーケースで空配列を返す（エラーを再スローしない）
    // これにより、フロントエンドが常に動作する
    
    // テーブルが存在しない場合
    if (error.message && (
      error.message.includes('does not exist') || 
      error.message.includes('relation') ||
      error.message.includes('no such table') ||
      error.message.includes('relation "') ||
      error.message.includes('syntax error')
    )) {
      console.warn('⚠️  テーブルまたはクエリエラー。空配列を返します。');
      return [];
    }
    
    // データベース接続エラー
    if (error.message && (
      error.message.includes('データベース接続') ||
      error.message.includes('connection') ||
      error.message.includes('POSTGRES_URL') ||
      error.message.includes('DATABASE_URL') ||
      error.message.includes('getPool') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND')
    )) {
      console.warn('⚠️  データベース接続エラー。空配列を返します。');
      return [];
    }
    
    // その他のすべてのエラーも空配列を返す
    console.warn('⚠️  予期しないエラーが発生しましたが、空配列を返して続行します。');
    return [];
  }
}

/**
 * 場所データを保存
 * @param {string} locationId - 場所ID
 * @param {string} name - 場所名
 * @param {string} qrCodeUrl - QRコードURL
 */
async function saveLocation(locationId, name, qrCodeUrl) {
  try {
    // 場所テーブルが存在しない場合は作成
    await query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        location_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        qr_code_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await query(
      `INSERT INTO locations (location_id, name, qr_code_url)
       VALUES ($1, $2, $3)
       ON CONFLICT (location_id) DO UPDATE SET
         name = EXCLUDED.name,
         qr_code_url = EXCLUDED.qr_code_url`,
      [locationId, name, qrCodeUrl]
    );
  } catch (error) {
    console.error('場所保存エラー:', error);
    throw error;
  }
}

/**
 * 感情選択を記録
 * @param {string} mood - 選択された感情
 */
async function recordMoodSelection(mood) {
  try {
    // データベースが初期化されていることを確認
    if (!isInitialized) {
      await initializeDatabase();
    }
    
    // 既存の感情があるかチェック
    const existing = await query(
      `SELECT * FROM mood_stats WHERE mood = $1`,
      [mood]
    );
    
    if (existing.rows.length > 0) {
      // 既存の感情のカウントを増やす
      await query(
        `UPDATE mood_stats 
         SET count = count + 1, updated_at = CURRENT_TIMESTAMP 
         WHERE mood = $1`,
        [mood]
      );
    } else {
      // 新しい感情を追加
      await query(
        `INSERT INTO mood_stats (mood, count) 
         VALUES ($1, 1)`,
        [mood]
      );
    }
  } catch (error) {
    console.error('感情選択記録エラー:', error);
    console.error('エラーの詳細:', error.message);
    throw error;
  }
}

/**
 * 感情選択統計を取得
 * @returns {Promise<Array>} 感情選択統計
 */
async function getMoodStats() {
  try {
    const result = await query(
      `SELECT mood, count, created_at, updated_at 
       FROM mood_stats 
       ORDER BY count DESC`
    );
    
    return result.rows || [];
  } catch (error) {
    console.error('感情統計取得エラー:', error);
    throw error;
  }
}

/**
 * 統計データを取得
 * @returns {Promise<Object>} 統計データ
 */
async function getStatistics() {
  try {
    const stats = {};
    
    // 総アンケート数
    const totalResult = await query(`SELECT COUNT(*) as total FROM surveys`);
    stats.totalSurveys = parseInt(totalResult.rows[0].total);
    
    // 気分別統計
    const moodResult = await query(
      `SELECT mood, COUNT(*) as count 
       FROM surveys 
       GROUP BY mood`
    );
    stats.moodDistribution = moodResult.rows;
    
    // 場所別統計
    const locationResult = await query(
      `SELECT location_id, COUNT(*) as count 
       FROM surveys 
       GROUP BY location_id`
    );
    stats.locationDistribution = locationResult.rows;
    
    return stats;
  } catch (error) {
    console.error('統計取得エラー:', error);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  saveSurvey,
  getSurvey,
  updateSurveyWithHaiku,
  getHaikusByLocation,
  getAllHaikus,
  saveLocation,
  recordMoodSelection,
  getMoodStats,
  getStatistics
};
