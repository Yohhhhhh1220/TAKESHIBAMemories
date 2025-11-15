// OpenAIモデルとAPIのテスト用スクリプト
require('dotenv').config();
const OpenAI = require('openai');

console.log('=== OpenAI モデルとAPIテスト ===');
console.log('環境変数OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '設定済み' : '未設定');

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEYが設定されていません');
  console.error('   手順:');
  console.error('   1. .envファイルを作成');
  console.error('   2. OPENAI_API_KEY=your_api_key_here を追加');
  console.error('   3. npm run test:models を実行');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// テストするモデルリスト
const modelsToTest = [
  "gpt-4o-mini",
  "gpt-4o",
  "o1-mini",
  "o1-preview"
];

async function testResponsesAPI(model) {
  try {
    console.log(`\n🔄 ${model} - Responses APIをテスト中...`);
    
    if (!openai.responses || typeof openai.responses.create !== 'function') {
      console.log(`   ⚠️  Responses APIが利用できません`);
      return false;
    }
    
    const response = await openai.responses.create({
      model: model,
      input: "こんにちは、元気？",
    });
    
    // レスポンス形式に応じてテキストを抽出
    const responseText = response.output_text || 
                        response.output?.[0]?.content?.[0]?.text || 
                        response.text ||
                        (typeof response === 'string' ? response : null);
    
    if (responseText && responseText.trim()) {
      console.log(`   ✅ Responses API成功！`);
      console.log(`   レスポンス: ${responseText.trim()}`);
      return true;
    } else {
      console.log(`   ⚠️  レスポンスが空です`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Responses APIエラー: ${error.message}`);
    if (error.status) {
      console.log(`   ステータス: ${error.status}`);
    }
    if (error.code) {
      console.log(`   コード: ${error.code}`);
    }
    return false;
  }
}

async function testChatCompletionsAPI(model) {
  try {
    console.log(`\n🔄 ${model} - Chat Completions APIをテスト中...`);
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "user",
          content: "こんにちは、元気？"
        }
      ],
      max_tokens: 50
    });
    
    if (!completion || !completion.choices || completion.choices.length === 0) {
      console.log(`   ⚠️  レスポンスが無効です`);
      return false;
    }
    
    const message = completion.choices[0].message;
    if (!message || !message.content) {
      console.log(`   ⚠️  コンテンツがありません`);
      return false;
    }
    
    console.log(`   ✅ Chat Completions API成功！`);
    console.log(`   レスポンス: ${message.content.trim()}`);
    return true;
    
  } catch (error) {
    console.log(`   ❌ Chat Completions APIエラー: ${error.message}`);
    if (error.status) {
      console.log(`   ステータス: ${error.status}`);
    }
    if (error.code) {
      console.log(`   コード: ${error.code}`);
    }
    return false;
  }
}

async function testAllModels() {
  console.log('\n=== 全モデルのテスト開始 ===\n');
  
  const results = {};
  
  for (const model of modelsToTest) {
    console.log(`\n📦 モデル: ${model}`);
    console.log('─'.repeat(50));
    
    // Responses APIをテスト
    const responsesSuccess = await testResponsesAPI(model);
    
    // Chat Completions APIをテスト
    const chatSuccess = await testChatCompletionsAPI(model);
    
    results[model] = {
      responsesAPI: responsesSuccess,
      chatCompletionsAPI: chatSuccess,
      available: responsesSuccess || chatSuccess
    };
    
    // 少し待機（レート制限対策）
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 結果サマリー
  console.log('\n\n=== テスト結果サマリー ===');
  console.log('─'.repeat(50));
  
  for (const [model, result] of Object.entries(results)) {
    const status = result.available ? '✅ 利用可能' : '❌ 利用不可';
    console.log(`\n${model}: ${status}`);
    console.log(`   Responses API: ${result.responsesAPI ? '✅' : '❌'}`);
    console.log(`   Chat Completions API: ${result.chatCompletionsAPI ? '✅' : '❌'}`);
  }
  
  // 利用可能なモデルをリストアップ
  const availableModels = Object.entries(results)
    .filter(([_, result]) => result.available)
    .map(([model, _]) => model);
  
  if (availableModels.length > 0) {
    console.log('\n✅ 利用可能なモデル:');
    availableModels.forEach(model => console.log(`   - ${model}`));
  } else {
    console.log('\n❌ 利用可能なモデルがありません');
    console.log('   OpenAIダッシュボードでモデルのアクセス権限を確認してください');
  }
}

testAllModels().catch(error => {
  console.error('\n❌ テスト実行エラー:');
  console.error(error);
  process.exit(1);
});

