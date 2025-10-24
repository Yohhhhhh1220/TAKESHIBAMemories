const axios = require('axios');

// 本番環境でテスト
const BASE_URL = 'https://takeshiba-memories-a3or.vercel.app';

async function testEmotionAPI() {
  try {
    console.log('🎵 感情データ取得APIをテスト中...');
    console.log(`📍 テストURL: ${BASE_URL}/api/emotion-counts`);
    
    const response = await axios.get(`${BASE_URL}/api/emotion-counts`);
    
    console.log('✅ APIレスポンス成功！');
    console.log('📊 感情データ:', JSON.stringify(response.data, null, 2));
    
    // レスポンスヘッダーを確認
    console.log('🔧 CORS設定確認:');
    console.log('  - Access-Control-Allow-Origin:', response.headers['access-control-allow-origin']);
    console.log('  - Access-Control-Allow-Methods:', response.headers['access-control-allow-methods']);
    console.log('  - Access-Control-Allow-Headers:', response.headers['access-control-allow-headers']);
    
  } catch (error) {
    console.error('❌ APIテスト失敗:', error.message);
    if (error.response) {
      console.error('   ステータス:', error.response.status);
      console.error('   レスポンス:', error.response.data);
    }
  }
}

// テスト実行
testEmotionAPI();
