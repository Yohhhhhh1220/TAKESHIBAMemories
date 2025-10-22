// 音楽生成のテスト用スクリプト
require('dotenv').config();
const { generateMusic } = require('./services/musicService');

async function testMusicGeneration() {
  console.log('=== 音楽生成テスト ===');
  console.log('Suno API Key:', process.env.SUNO_API_KEY ? '設定済み' : '未設定');
  console.log('Google Music API Key:', process.env.GOOGLE_MUSIC_API_KEY ? '設定済み' : '未設定');
  
  // テスト用の俳句
  const testHaiku = "竹芝の風\n心に響く音\n新たな出会い";
  
  try {
    console.log('\n=== 音楽生成開始 ===');
    console.log('テスト俳句:', testHaiku);
    
    const musicData = await generateMusic(testHaiku);
    
    console.log('\n=== 音楽生成結果 ===');
    console.log('成功:', musicData.audioUrl ? 'Yes' : 'No');
    console.log('音楽URL:', musicData.audioUrl || 'なし（ローカル生成）');
    console.log('継続時間:', musicData.duration + '秒');
    console.log('API:', musicData.metadata.api);
    console.log('フォールバック:', musicData.metadata.fallback);
    
    if (musicData.metadata.features) {
      console.log('\n=== 生成された音楽特徴 ===');
      console.log('気分:', musicData.metadata.features.mood);
      console.log('季節:', musicData.metadata.features.season);
      console.log('場所:', musicData.metadata.features.location);
      console.log('テンポ:', musicData.metadata.features.tempo + ' BPM');
      console.log('楽器:', musicData.metadata.features.instruments.join(', '));
      console.log('キー:', musicData.metadata.features.key);
    }
    
    if (musicData.metadata.error) {
      console.log('\n=== エラー情報 ===');
      console.log('エラー:', musicData.metadata.error);
    }
    
  } catch (error) {
    console.error('❌ 音楽生成テストエラー:', error.message);
  }
}

testMusicGeneration();
