const express = require('express');
const router = express.Router();
const { generateQRCode, generateMultipleQRCodes, getQRCodes, deleteQRCode } = require('../services/qrService');
const { saveLocation } = require('../services/postgresService');
const musicStreamService = require('../services/musicStreamService');

// QRコード生成API
router.post('/qr/generate', async (req, res) => {
  try {
    const { locationId, locationName } = req.body;
    
    if (!locationId || !locationName) {
      return res.status(400).json({
        success: false,
        error: '場所IDと場所名が必要です'
      });
    }
    
    const qrCode = await generateQRCode(locationId, locationName);
    
    // 場所情報をデータベースに保存
    await saveLocation({
      id: locationId,
      name: locationName,
      description: `竹芝エリアの${locationName}`,
      qrCodeUrl: qrCode.qrUrl
    });
    
    res.json({
      success: true,
      qrCode
    });
    
  } catch (error) {
    console.error('QRコード生成エラー:', error);
    res.status(500).json({
      success: false,
      error: 'QRコード生成中にエラーが発生しました'
    });
  }
});

// 複数QRコード一括生成API
router.post('/qr/generate-multiple', async (req, res) => {
  try {
    const { locations } = req.body;
    
    if (!locations || !Array.isArray(locations)) {
      return res.status(400).json({
        success: false,
        error: '場所情報の配列が必要です'
      });
    }
    
    const qrCodes = await generateMultipleQRCodes(locations);
    
    // 場所情報をデータベースに保存
    for (const location of locations) {
      await saveLocation({
        id: location.id,
        name: location.name,
        description: location.description || `竹芝エリアの${location.name}`,
        qrCodeUrl: `${process.env.QR_BASE_URL}/survey/${location.id}`
      });
    }
    
    res.json({
      success: true,
      qrCodes
    });
    
  } catch (error) {
    console.error('複数QRコード生成エラー:', error);
    res.status(500).json({
      success: false,
      error: 'QRコード生成中にエラーが発生しました'
    });
  }
});

// QRコード一覧取得API
router.get('/qr/list', async (req, res) => {
  try {
    const qrCodes = await getQRCodes();
    res.json({
      success: true,
      qrCodes
    });
  } catch (error) {
    console.error('QRコード一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'QRコード一覧取得中にエラーが発生しました'
    });
  }
});

// QRコード削除API
router.delete('/qr/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const deleted = await deleteQRCode(locationId);
    
    res.json({
      success: deleted,
      message: deleted ? 'QRコードを削除しました' : 'QRコードが見つかりませんでした'
    });
  } catch (error) {
    console.error('QRコード削除エラー:', error);
    res.status(500).json({
      success: false,
      error: 'QRコード削除中にエラーが発生しました'
    });
  }
});

// 音楽ストリーム管理API
router.get('/music/streams', (req, res) => {
  try {
    const statistics = musicStreamService.getStatistics();
    res.json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('音楽ストリーム情報取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '音楽ストリーム情報取得中にエラーが発生しました'
    });
  }
});

// 音楽ストリーム停止API
router.post('/music/stop/:locationId', (req, res) => {
  try {
    const { locationId } = req.params;
    musicStreamService.stopStream(locationId);
    
    res.json({
      success: true,
      message: `場所 ${locationId} の音楽ストリームを停止しました`
    });
  } catch (error) {
    console.error('音楽ストリーム停止エラー:', error);
    res.status(500).json({
      success: false,
      error: '音楽ストリーム停止中にエラーが発生しました'
    });
  }
});

// 全ての音楽ストリーム停止API
router.post('/music/stop-all', (req, res) => {
  try {
    musicStreamService.stopAllStreams();
    
    res.json({
      success: true,
      message: '全ての音楽ストリームを停止しました'
    });
  } catch (error) {
    console.error('全音楽ストリーム停止エラー:', error);
    res.status(500).json({
      success: false,
      error: '音楽ストリーム停止中にエラーが発生しました'
    });
  }
});

// 音楽キュー管理API
router.get('/music/queue/:locationId', (req, res) => {
  try {
    const { locationId } = req.params;
    const queue = musicStreamService.getMusicQueue(locationId);
    
    res.json({
      success: true,
      queue
    });
  } catch (error) {
    console.error('音楽キュー取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '音楽キュー取得中にエラーが発生しました'
    });
  }
});

// 音楽キュークリアAPI
router.delete('/music/queue/:locationId', (req, res) => {
  try {
    const { locationId } = req.params;
    musicStreamService.clearQueue(locationId);
    
    res.json({
      success: true,
      message: `場所 ${locationId} の音楽キューをクリアしました`
    });
  } catch (error) {
    console.error('音楽キュークリアエラー:', error);
    res.status(500).json({
      success: false,
      error: '音楽キュークリア中にエラーが発生しました'
    });
  }
});

module.exports = router;
