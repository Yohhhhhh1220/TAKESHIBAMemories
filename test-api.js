// APIキーのテスト用スクリプト
require('dotenv').config();
const OpenAI = require('openai');

console.log('=== OpenAI APIキーテスト ===');
console.log('環境変数OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '設定済み' : '未設定');
console.log('キーの長さ:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
console.log('キーの先頭:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'なし');

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEYが設定されていません');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testAPI() {
  try {
    console.log('\n=== API接続テスト開始 ===');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        {
          role: "user",
          content: "こんにちは。テストです。"
        }
      ],
      max_tokens: 10
    });

    console.log('✅ API接続成功！');
    console.log('レスポンス:', completion.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ API接続エラー:');
    console.error('エラーメッセージ:', error.message);
    console.error('エラーの種類:', error.name);
    console.error('ステータス:', error.status);
    console.error('レスポンス:', error.response?.data);
  }
}

testAPI();
