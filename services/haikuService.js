const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * アンケート回答に基づいて俳句を生成
 * @param {Object} answers - アンケート回答
 * @returns {Promise<string>} 生成された俳句
 */
async function generateHaiku(answers) {
  try {
    // APIキーの確認
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEYが設定されていません');
      return "APIキー未設定\n.envファイルを確認\n竹芝の風";
    }
    
    // 余分な空白や改行を除去してチェックを緩和
    const sanitizedKey = String(process.env.OPENAI_API_KEY).trim();
    if (!sanitizedKey) {
      console.error('❌ OPENAI_API_KEYが空です');
      return "APIキー未設定\n.envファイルを確認\n竹芝の風";
    }
    // 形式チェックは警告ログのみに変更（失敗の原因にしない）
    if (!sanitizedKey.startsWith('sk-')) {
      console.warn('⚠️ OPENAI_API_KEYが想定形式(sk-)ではありませんが続行します');
    }
    
    const prompt = createHaikuPrompt(answers);
    
    // デバッグ用ログ
    console.log('=== 俳句生成デバッグ情報 ===');
    console.log('アンケート回答:', answers);
    console.log('APIキー確認:', sanitizedKey.substring(0, 10) + '...');
    console.log('生成されたプロンプト:', prompt);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        {
          role: "system",
          content: "あなたは竹芝エリアの雰囲気を深く理解し、訪問者の具体的な体験と感情を俳句に昇華する専門の詩人です。アンケートの詳細な内容を必ず俳句に反映し、その人の体験に特化した個性的な俳句を創作してください。伝統的な俳句の形式（5-7-5）を厳密に守りながら、現代的な感性と竹芝エリアの特徴を織り込んでください。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.8
    });

    const haiku = completion.choices[0].message.content.trim();
    
    // 成功時のログ
    console.log('✅ ChatGPTから俳句を生成しました:');
    console.log('生成された俳句:', haiku);
    console.log('========================');
    
    return haiku;
    
  } catch (error) {
    console.error('俳句生成エラー:', error);
    console.error('エラーの詳細:', error.message);
    console.error('エラーの種類:', error.name);
    console.error('エラーのスタック:', error.stack);
    console.error('エラーのステータス:', error.status);
    console.error('エラーのレスポンス:', error.response?.data);
    
    // エラーの種類に応じたフォールバック俳句
    if (error.message.includes('API key') || error.message.includes('authentication') || error.message.includes('401')) {
      console.error('❌ OpenAI APIキーが無効です');
      return "APIキーエラー\n設定を確認してください\n竹芝の風";
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      console.error('❌ APIレート制限に達しました');
      return "しばらく待って\nまた試してください\n竹芝の風";
    } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      console.error('❌ ネットワークエラー');
      return "ネットワークエラー\n接続を確認してください\n竹芝の風";
    } else {
      console.error('❌ その他のエラー:', error.message);
      return "システムエラー\nしばらく待ってください\n竹芝の風";
    }
  }
}

/**
 * アンケート回答から俳句生成用のプロンプトを作成
 * @param {Object} answers - アンケート回答
 * @returns {string} プロンプト
 */
function createHaikuPrompt(answers) {
  const { purpose, mood, reason, location } = answers;
  
  // 目的に応じた具体的な描写
  const purposeDescriptions = {
    'work': '仕事の忙しさ、通勤の疲れ、職場への思い',
    'leisure': '観光の楽しさ、新しい発見、リラックスした時間',
    'shopping': '買い物の楽しさ、商品への期待、満足感',
    'dining': '食事の香り、味わい、食への感謝',
    'meeting': '人との出会い、話し合い、つながり',
    'exercise': '体を動かす爽快感、健康への意識、自然との触れ合い',
    'other': '特別な目的、個人的な理由、心の動き'
  };
  
  // 気分に応じた具体的な表現
  const moodDescriptions = {
    'exhilarated': '高揚感、爽快感、心が躍る、気分が最高潮',
    'excited': 'ワクワク、興奮、期待、胸の高鳴り',
    'inspired': 'インスピレーション、創造性、刺激、ひらめき',
    'joyful': '喜び、笑顔、明るい気持ち、楽しい時間',
    'calm': '穏やかさ、静寂、心の安らぎ、落ち着き',
    'relaxed': 'リラックス、くつろぎ、のんびり、安らぎ',
    'content': '満足感、充実感、心が満たされている、穏やかな喜び',
    'hopeful': '希望、前向き、期待、未来への憧れ',
    'melancholy': '憂鬱、物悲しさ、静かな悲しみ、郷愁',
    'lonely': '孤独感、寂しさ、一人の時間、内省',
    'tired': '疲労、倦怠感、休息への欲求、静寂',
    'apathetic': '無気力、関心の薄さ、静寂、内省',
    'anxious': '不安、焦り、心配、緊張感',
    'tense': '緊張、硬直、ストレス、重圧感',
    'irritated': 'いら立ち、苛立ち、不満、静かな怒り',
    'surprised': '驚き、意外性、新鮮さ、発見の喜び'
  };
  
  let prompt = `あなたは竹芝エリアの体験を俳句に表現する詩人です。\n\n`;
  prompt += `【訪問者の詳細情報】\n`;
  prompt += `・訪問目的: ${purpose} (${purposeDescriptions[purpose] || '特別な目的'})\n`;
  prompt += `・現在の気分: ${mood} (${moodDescriptions[mood] || '複雑な感情'})\n`;
  prompt += `・その理由: "${reason}"\n`;
  if (location) {
    prompt += `・現在地: ${location}\n`;
  }
  
  prompt += `\n【俳句作成の指示】\n`;
  prompt += `1. 上記の具体的な体験内容を必ず俳句に反映してください\n`;
  prompt += `2. 訪問目的（${purpose}）の雰囲気を表現してください\n`;
  prompt += `3. 気分（${mood}）を俳句の感情として込めてください\n`;
  prompt += `4. 理由（"${reason}"）の内容を俳句の背景として活用してください\n`;
  prompt += `5. 竹芝エリアの特徴（海、ビル、歴史、交通）を織り込んでください\n`;
  prompt += `6. 5-7-5の音数律を厳密に守ってください\n`;
  prompt += `7. 切れ字（や、かな、けり、なり）を適切に使用してください\n`;
  prompt += `8. 現代的な感性と伝統的な俳句の美しさを両立させてください\n\n`;
  
  prompt += `【重要な注意】\n`;
  prompt += `- アンケートの内容を具体的に反映した俳句にしてください\n`;
  prompt += `- 一般的な俳句ではなく、この人の体験に特化した俳句にしてください\n`;
  prompt += `- 俳句のみを出力し、説明は不要です\n`;
  
  return prompt;
}

module.exports = {
  generateHaiku
};
