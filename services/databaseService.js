const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// データベースディレクトリを作成
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dbDir, 'survey.db');
const db = new sqlite3.Database(dbPath);

// データベーステーブルを初期化
db.serialize(() => {
  // アンケートテーブル
  db.run(`
    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT NOT NULL,
      purpose TEXT,
      mood TEXT,
      reason TEXT,
      haiku TEXT,
      music_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 場所テーブル
  db.run(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      qr_code_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 俳句テーブル（統計用）
  db.run(`
    CREATE TABLE IF NOT EXISTS haikus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER,
      haiku_text TEXT NOT NULL,
      mood_category TEXT,
      season_category TEXT,
      location_category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (survey_id) REFERENCES surveys (id)
    )
  `);
  
  // 感情選択統計テーブル
  db.run(`
    CREATE TABLE IF NOT EXISTS mood_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mood TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

/**
 * アンケートデータを保存
 * @param {string} locationId - 場所ID
 * @param {Object} answers - アンケート回答
 * @returns {Promise<number>} 保存されたアンケートのID
 */
function saveSurvey(locationId, answers) {
  return new Promise((resolve, reject) => {
    const { purpose, mood, reason } = answers;
    
    db.run(
      `INSERT INTO surveys (location_id, purpose, mood, reason) VALUES (?, ?, ?, ?)`,
      [locationId, purpose, mood, reason],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

/**
 * アンケートデータを取得
 * @param {number} surveyId - アンケートID
 * @returns {Promise<Object>} アンケートデータ
 */
function getSurvey(surveyId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM surveys WHERE id = ?`,
      [surveyId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

/**
 * 俳句を更新
 * @param {number} surveyId - アンケートID
 * @param {string} haiku - 俳句テキスト
 * @param {Object} musicData - 音楽データ
 */
function updateSurveyWithHaiku(surveyId, haiku, musicData) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE surveys SET haiku = ?, music_data = ? WHERE id = ?`,
      [haiku, JSON.stringify(musicData), surveyId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      }
    );
  });
}

/**
 * 場所別の俳句一覧を取得（重複除去）
 * @param {string} locationId - 場所ID
 * @returns {Promise<Array>} 俳句一覧
 */
function getHaikusByLocation(locationId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT haiku, location_id, created_at, id FROM surveys 
       WHERE location_id = ? AND haiku IS NOT NULL AND haiku != '' 
       ORDER BY created_at DESC`,
      [locationId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

/**
 * 場所情報を保存
 * @param {Object} location - 場所情報
 */
function saveLocation(location) {
  return new Promise((resolve, reject) => {
    const { id, name, description, qrCodeUrl } = location;
    
    db.run(
      `INSERT OR REPLACE INTO locations (id, name, description, qr_code_url) VALUES (?, ?, ?, ?)`,
      [id, name, description, qrCodeUrl],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

/**
 * 全俳句一覧を取得（重複除去）
 * @returns {Promise<Array>} 俳句一覧
 */
function getAllHaikus() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT haiku, location_id, created_at, id FROM surveys 
       WHERE haiku IS NOT NULL AND haiku != '' 
       ORDER BY created_at DESC`,
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

/**
 * 感情選択を記録
 * @param {string} mood - 選択された感情
 */
function recordMoodSelection(mood) {
  return new Promise((resolve, reject) => {
    // 既存の感情があるかチェック
    db.get(`SELECT * FROM mood_stats WHERE mood = ?`, [mood], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row) {
        // 既存の感情のカウントを増やす
        db.run(
          `UPDATE mood_stats SET count = count + 1, updated_at = CURRENT_TIMESTAMP WHERE mood = ?`,
          [mood],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(this.changes);
            }
          }
        );
      } else {
        // 新しい感情を追加
        db.run(
          `INSERT INTO mood_stats (mood, count) VALUES (?, 1)`,
          [mood],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(this.lastID);
            }
          }
        );
      }
    });
  });
}

/**
 * 感情選択統計を取得
 * @returns {Promise<Array>} 感情選択統計
 */
function getMoodStats() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT mood, count, created_at, updated_at FROM mood_stats ORDER BY count DESC`,
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

/**
 * 統計データを取得
 * @returns {Promise<Object>} 統計データ
 */
function getStatistics() {
  return new Promise((resolve, reject) => {
    const stats = {};
    
    // 総アンケート数
    db.get(`SELECT COUNT(*) as total FROM surveys`, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      stats.totalSurveys = row.total;
      
      // 気分別統計
      db.all(`SELECT mood, COUNT(*) as count FROM surveys GROUP BY mood`, (err, moodRows) => {
        if (err) {
          reject(err);
          return;
        }
        stats.moodDistribution = moodRows;
        
        // 場所別統計
        db.all(`SELECT location_id, COUNT(*) as count FROM surveys GROUP BY location_id`, (err, locationRows) => {
          if (err) {
            reject(err);
            return;
          }
          stats.locationDistribution = locationRows;
          resolve(stats);
        });
      });
    });
  });
}

module.exports = {
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
