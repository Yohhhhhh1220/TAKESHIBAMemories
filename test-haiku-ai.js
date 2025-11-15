// 川柳生成AIのテスト用スクリプト
require('dotenv').config();
const { generateHaiku } = require('./services/haikuService');

console.log('=== 川柳生成AIテスト ===');
console.log('環境変数OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '設定済み' : '未設定');

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEYが設定されていません');
  console.error('   手順:');
  console.error('   1. .envファイルを作成');
  console.error('   2. OPENAI_API_KEY=your_api_key_here を追加');
  console.error('   3. npm run test:haiku を実行');
  process.exit(1);
}

// テスト用のアンケート回答
const testAnswers = {
  location: 'takeshiba-park',
  purpose: '観光',
  mood: 'excited',
  reason: '美しい海と緑が素晴らしい'
};

async function testHaikuGeneration() {
  try {
    console.log('\n=== 川柳生成テスト開始 ===');
    console.log('テストデータ:', JSON.stringify(testAnswers, null, 2));
    
    const haiku = await generateHaiku(testAnswers);
    
    console.log('\n✅ 川柳生成成功！');
    console.log('生成された川柳:');
    console.log('─────────────────');
    console.log(haiku);
    console.log('─────────────────');
    
  } catch (error) {
    console.error('\n❌ 川柳生成エラー:');
    console.error('エラーメッセージ:', error.message);
    console.error('エラーの種類:', error.name);
    console.error('ステータス:', error.status);
    console.error('エラーコード:', error.code);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

testHaikuGeneration();

