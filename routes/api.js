const express = require('express');
const router = express.Router();
const { generateHaiku } = require('../services/haikuService');
const { saveSurvey, getSurvey, updateSurveyWithHaiku, recordMoodSelection, getMoodStats } = require('../services/postgresService');
const { generateLocationQRCodes, generateMainQRCode } = require('../services/qrService');

// アンケート送信API
router.post('/survey', async (req, res) => {
  try {
    const { locationId, answers } = req.body;
    
    // アンケートデータを保存
    const surveyId = await saveSurvey(locationId, answers);
    
    // 感情選択を記録
    await recordMoodSelection(answers.mood);
    
    // 俳句を生成
    const haiku = await generateHaiku(answers);
    
    // データベースに俳句を保存
    await updateSurveyWithHaiku(surveyId, haiku, null);
    
    // 結果を返す
    res.json({
      success: true,
      surveyId,
      haiku
    });
    
    // リアルタイムで俳句を配信
    const io = req.app.get('io');
    io.to(`location-${locationId}`).emit('new-haiku', {
      haiku,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('アンケート処理エラー:', error);
    res.status(500).json({
      success: false,
      error: 'アンケート処理中にエラーが発生しました'
    });
  }
});

// 俳句取得API
router.get('/haiku/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const survey = await getSurvey(id);
    
    if (!survey) {
      return res.status(404).json({ error: '俳句が見つかりません' });
    }
    
    res.json(survey);
  } catch (error) {
    console.error('俳句取得エラー:', error);
    res.status(500).json({ error: '俳句取得中にエラーが発生しました' });
  }
});

// 場所別の俳句一覧取得API
router.get('/location/:locationId/haikus', async (req, res) => {
  try {
    const { locationId } = req.params;
    const { getHaikusByLocation } = require('../services/databaseService');
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
    const { getAllHaikus } = require('../services/postgresService');
    const haikus = await getAllHaikus();
    res.json({ haikus });
  } catch (error) {
    console.error('俳句一覧取得エラー:', error);
    res.status(500).json({ error: '俳句一覧取得中にエラーが発生しました' });
  }
});

// 感情選択統計取得API（管理者用）
router.get('/admin/mood-stats', async (req, res) => {
  try {
    const moodStats = await getMoodStats();
    res.json({ moodStats });
  } catch (error) {
    console.error('感情統計取得エラー:', error);
    res.status(500).json({ error: '感情統計取得中にエラーが発生しました' });
  }
});

// QRコード生成API（管理者用）
router.post('/admin/generate-qr', async (req, res) => {
  try {
    const { baseUrl } = req.body;
    
    if (!baseUrl) {
      return res.status(400).json({ error: 'baseUrlが必要です' });
    }
    
    // 場所別QRコードを生成
    const locationQRCodes = await generateLocationQRCodes(baseUrl);
    
    // メインQRコードを生成
    const mainQRCode = await generateMainQRCode(baseUrl);
    
    res.json({
      success: true,
      mainQRCode,
      locationQRCodes,
      message: 'QRコードを生成しました'
    });
    
  } catch (error) {
    console.error('QRコード生成エラー:', error);
    res.status(500).json({ error: 'QRコード生成中にエラーが発生しました' });
  }
});

module.exports = router;
