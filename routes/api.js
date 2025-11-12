const express = require('express');
const router = express.Router();

// モジュールの読み込みをエラーハンドリング付きで行う
let generateHaiku, saveSurvey, getSurvey, updateSurveyWithHaiku, recordMoodSelection;

try {
  console.log('🔄 haikuService の読み込みを開始...');
  const haikuService = require('../services/haikuService');
  console.log('✅ haikuService モジュール読み込み完了');
  console.log('haikuService の内容:', Object.keys(haikuService));
  
  if (!haikuService || typeof haikuService.generateHaiku !== 'function') {
    throw new Error('haikuService.generateHaiku が関数ではありません');
  }
  
  generateHaiku = haikuService.generateHaiku;
  console.log('✅ haikuService.generateHaiku が設定されました');
} catch (error) {
  console.error('❌ Error loading haikuService:', error);
  console.error('エラーの詳細:', error.message);
  console.error('エラーのスタック:', error.stack);
  console.error('エラーの種類:', error.name);
  console.error('エラーコード:', error.code);
  
  // より詳細なエラー情報をログに出力
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('❌ モジュールが見つかりません。ファイルパスを確認してください。');
  }
  
  generateHaiku = async () => { 
    throw new Error(`haikuService not loaded: ${error.message}`); 
  };
}

try {
  const postgresService = require('../services/postgresService');
  saveSurvey = postgresService.saveSurvey;
  getSurvey = postgresService.getSurvey;
  updateSurveyWithHaiku = postgresService.updateSurveyWithHaiku;
  recordMoodSelection = postgresService.recordMoodSelection;
  console.log('✅ postgresService loaded');
} catch (error) {
  console.error('❌ Error loading postgresService:', error);
  console.error('Error details:', error.message);
  console.error('Error stack:', error.stack);
  // フォールバック関数を設定
  saveSurvey = async () => { throw new Error('postgresService not loaded'); };
  getSurvey = async () => { throw new Error('postgresService not loaded'); };
  updateSurveyWithHaiku = async () => { throw new Error('postgresService not loaded'); };
  recordMoodSelection = async () => { throw new Error('postgresService not loaded'); };
}

// アンケート送信API
router.post('/survey', async (req, res) => {
  console.log('📝 /api/survey リクエスト受信');
  console.log('リクエストボディ:', JSON.stringify(req.body, null, 2));
  
  try {
    // データベース接続の確認と初期化
    console.log('🗄️  データベース初期化を開始...');
    const postgresService = require('../services/postgresService');
    const { initializeDatabase } = postgresService;
    
    try {
      await initializeDatabase();
      console.log('✅ データベース初期化完了');
    } catch (initError) {
      console.warn('⚠️  データベース初期化警告（既に初期化済みの可能性）:', initError.message);
      console.warn('⚠️  スタック:', initError.stack);
    }
    
    const { locationId, answers } = req.body;
    
    if (!locationId || !answers) {
      console.error('❌ バリデーションエラー: locationId または answers が不足');
      return res.status(400).json({
        success: false,
        error: 'locationId と answers が必要です'
      });
    }
    
    console.log('💾 アンケートデータを保存中...');
    // アンケートデータを保存
    const surveyId = await saveSurvey(locationId, answers);
    console.log('✅ アンケート保存完了, surveyId:', surveyId);
    
    // 感情選択を記録
    console.log('💾 感情選択を記録中...');
    await recordMoodSelection(answers.mood);
    console.log('✅ 感情選択記録完了');
    
    // 俳句を生成
    console.log('🎨 俳句を生成中...');
    const haiku = await generateHaiku(answers);
    console.log('✅ 俳句生成完了:', haiku);
    
    // データベースに俳句を保存
    console.log('💾 俳句をデータベースに保存中...');
    await updateSurveyWithHaiku(surveyId, haiku, null);
    console.log('✅ 俳句保存完了');
    
    // 結果を返す
    console.log('✅ アンケート処理完了, surveyId:', surveyId);
    res.json({
      success: true,
      surveyId,
      haiku
    });
    
    // リアルタイムで俳句を配信（開発環境のみ）
    const io = req.app.get('io');
    if (io) {
      const penname = answers.penname || '詠み人知らず';
      io.to(`location-${locationId}`).emit('new-haiku', {
        haiku,
        penname,
        timestamp: new Date()
      });
    }
    
  } catch (error) {
    console.error('❌ アンケート処理エラー:', error);
    console.error('エラーの詳細:', error.message);
    console.error('エラーのスタック:', error.stack);
    console.error('エラーの種類:', error.name);
    console.error('エラーコード:', error.code);
    console.error('エラーオブジェクト全体:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // エラーの種類に応じた適切なHTTPステータスコードを返す
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: 'アンケート処理中にエラーが発生しました',
      message: error.message || 'Unknown error',
      details: {
        name: error.name || 'Error',
        code: error.code || 'UNKNOWN',
        message: error.message || 'No error message'
      }
    });
  }
});

// 俳句取得API
router.get('/haiku/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { query } = require('../services/postgresService');
    
    // アンケートと俳句を結合して取得
    const result = await query(
      `SELECT s.*, h.haiku_text as haiku
       FROM surveys s
       LEFT JOIN haikus h ON h.survey_id = s.id
       WHERE s.id = $1`,
      [id]
    );
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '俳句が見つかりません' });
    }
    
    const data = result.rows[0];
    res.json({
      id: data.id,
      purpose: data.purpose,
      mood: data.mood,
      reason: data.reason,
      penname: data.penname || '詠み人知らず',
      haiku: data.haiku,
      created_at: data.created_at
    });
  } catch (error) {
    console.error('俳句取得エラー:', error);
    res.status(500).json({ error: '俳句取得中にエラーが発生しました' });
  }
});

// 場所別の俳句一覧取得API
router.get('/location/:locationId/haikus', async (req, res) => {
  try {
    const { locationId } = req.params;
    const { getHaikusByLocation } = require('../services/postgresService');
    const haikus = await getHaikusByLocation(locationId);
    res.json({ haikus });
  } catch (error) {
    console.error('俳句一覧取得エラー:', error);
    res.status(500).json({ error: '俳句一覧取得中にエラーが発生しました' });
  }
});

// 全俳句一覧取得API（フィルター用）
router.get('/haikus', async (req, res) => {
  try {
    // データベース接続の確認と初期化
    const { initializeDatabase, getAllHaikus } = require('../services/postgresService');
    
    // 初期化を試みる（エラーでも続行）
    try {
      await initializeDatabase();
    } catch (initError) {
      console.warn('データベース初期化警告（既に初期化済みの可能性）:', initError.message);
      // 初期化エラーでも続行（getAllHaikusが空配列を返す可能性がある）
    }
    
    // getAllHaikusは常に配列を返す（エラー時は空配列）
    const haikus = await getAllHaikus();
    
    // 常に正常なレスポンスとして返す（空配列でもOK）
    res.json({ 
      haikus: Array.isArray(haikus) ? haikus : [],
      success: true 
    });
  } catch (error) {
    // このcatchブロックは通常実行されない（getAllHaikusが常に配列を返すため）
    // ただし、万が一のエラーに備えて
    console.error('俳句一覧取得エラー（予期しないエラー）:', error);
    console.error('エラーの詳細:', error.message);
    console.error('エラーのスタック:', error.stack);
    
    // エラーが発生しても空配列を返してフロントエンドが動作するようにする
    res.status(200).json({ 
      haikus: [],
      success: false,
      error: '俳句の取得中にエラーが発生しましたが、アプリケーションは動作を続けます。'
    });
  }
});


module.exports = router;
