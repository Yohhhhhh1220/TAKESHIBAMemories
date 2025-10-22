const { sql } = require('@vercel/postgres');

/**
 * データベーステーブルを初期化
 */
async function initializeDatabase() {
  try {
    // アンケートテーブル
    await sql`
      CREATE TABLE IF NOT EXISTS surveys (
        id SERIAL PRIMARY KEY,
        location_id VARCHAR(50) NOT NULL,
        purpose VARCHAR(50),
        mood VARCHAR(50),
        reason TEXT,
        qr_code_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 俳句テーブル
    await sql`
      CREATE TABLE IF NOT EXISTS haikus (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER,
        haiku_text TEXT NOT NULL,
        mood_category VARCHAR(50),
        season_category VARCHAR(50),
        location_category VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (survey_id) REFERENCES surveys (id)
      )
    `;
    
    // 感情選択統計テーブル
    await sql`
      CREATE TABLE IF NOT EXISTS mood_stats (
        id SERIAL PRIMARY KEY,
        mood VARCHAR(50) NOT NULL,
        count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ PostgreSQLデータベーステーブルを初期化しました');
  } catch (error) {
    console.error('データベース初期化エラー:', error);
    throw error;
  }
}

/**
 * アンケートデータを保存
 * @param {string} locationId - 場所ID
 * @param {Object} answers - アンケート回答
 * @returns {Promise<number>} 保存されたアンケートID
 */
async function saveSurvey(locationId, answers) {
  try {
    const result = await sql`
      INSERT INTO surveys (location_id, purpose, mood, reason)
      VALUES (${locationId}, ${answers.purpose}, ${answers.mood}, ${answers.reason})
      RETURNING id
    `;
    
    return result.rows[0].id;
  } catch (error) {
    console.error('アンケート保存エラー:', error);
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
    const result = await sql`
      SELECT * FROM surveys WHERE id = ${surveyId}
    `;
    
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
    // 俳句テーブルに保存
    await sql`
      INSERT INTO haikus (survey_id, haiku_text)
      VALUES (${surveyId}, ${haiku})
    `;
    
    console.log(`✅ 俳句をデータベースに保存しました: ${haiku}`);
  } catch (error) {
    console.error('俳句保存エラー:', error);
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
    const result = await sql`
      SELECT DISTINCT h.haiku_text as haiku, s.location_id, h.created_at, h.id
      FROM haikus h
      JOIN surveys s ON h.survey_id = s.id
      WHERE s.location_id = ${locationId}
      ORDER BY h.created_at DESC
    `;
    
    return result.rows;
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
  try {
    const result = await sql`
      SELECT DISTINCT h.haiku_text as haiku, s.location_id, h.created_at, h.id
      FROM haikus h
      JOIN surveys s ON h.survey_id = s.id
      ORDER BY h.created_at DESC
    `;
    
    return result.rows;
  } catch (error) {
    console.error('全俳句取得エラー:', error);
    throw error;
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
    await sql`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        location_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        qr_code_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`
      INSERT INTO locations (location_id, name, qr_code_url)
      VALUES (${locationId}, ${name}, ${qrCodeUrl})
      ON CONFLICT (location_id) DO UPDATE SET
        name = EXCLUDED.name,
        qr_code_url = EXCLUDED.qr_code_url
    `;
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
    // 既存の感情があるかチェック
    const existing = await sql`
      SELECT * FROM mood_stats WHERE mood = ${mood}
    `;
    
    if (existing.rows.length > 0) {
      // 既存の感情のカウントを増やす
      await sql`
        UPDATE mood_stats 
        SET count = count + 1, updated_at = CURRENT_TIMESTAMP 
        WHERE mood = ${mood}
      `;
    } else {
      // 新しい感情を追加
      await sql`
        INSERT INTO mood_stats (mood, count) 
        VALUES (${mood}, 1)
      `;
    }
  } catch (error) {
    console.error('感情選択記録エラー:', error);
    throw error;
  }
}

/**
 * 感情選択統計を取得
 * @returns {Promise<Array>} 感情選択統計
 */
async function getMoodStats() {
  try {
    const result = await sql`
      SELECT mood, count, created_at, updated_at 
      FROM mood_stats 
      ORDER BY count DESC
    `;
    
    return result.rows;
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
    const totalResult = await sql`SELECT COUNT(*) as total FROM surveys`;
    stats.totalSurveys = parseInt(totalResult.rows[0].total);
    
    // 気分別統計
    const moodResult = await sql`
      SELECT mood, COUNT(*) as count 
      FROM surveys 
      GROUP BY mood
    `;
    stats.moodDistribution = moodResult.rows;
    
    // 場所別統計
    const locationResult = await sql`
      SELECT location_id, COUNT(*) as count 
      FROM surveys 
      GROUP BY location_id
    `;
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
