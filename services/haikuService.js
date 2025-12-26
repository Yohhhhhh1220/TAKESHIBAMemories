// OpenAIパッケージの読み込みをエラーハンドリング付きで行う
let OpenAI;
let openaiClient = null;

try {
  console.log('🔄 OpenAI パッケージの読み込みを開始...');
  OpenAI = require('openai');
  console.log('✅ OpenAI パッケージが読み込まれました');
} catch (error) {
  console.error('❌ OpenAI パッケージの読み込みエラー:', error);
  console.error('エラーの詳細:', error.message);
  console.error('エラーのスタック:', error.stack);
  throw new Error(`OpenAI パッケージの読み込みに失敗しました: ${error.message}`);
}

/**
 * OpenAIクライアントを取得（遅延初期化）
 */
function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY環境変数が設定されていません');
      throw new Error('OPENAI_API_KEY環境変数が設定されていません');
    }
    
    // APIキーの検証
    const sanitizedKey = String(apiKey).trim();
    if (!sanitizedKey) {
      console.error('❌ OPENAI_API_KEYが空です');
      throw new Error('OPENAI_API_KEYが空です');
    }
    
    // デバッグ情報（先頭と末尾のみ表示）
    const keyLength = sanitizedKey.length;
    const keyPreview = keyLength > 10 ? `${sanitizedKey.substring(0, 6)}...${sanitizedKey.substring(keyLength - 4)}` : '***';
    console.log('🔄 OpenAI クライアントを作成中...');
    console.log(`   APIキー長: ${keyLength}文字`);
    console.log(`   APIキープレビュー: ${keyPreview}`);
    
    openaiClient = new OpenAI({
      apiKey: sanitizedKey,
    });
    console.log('✅ OpenAI クライアントを作成しました');
  }
  return openaiClient;
}

/**
 * アンケート回答に基づいて川柳を生成
 * @param {Object} answers - アンケート回答
 * @returns {Promise<string>} 生成された川柳
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
    
    // プレースホルダー値のチェック
    if (sanitizedKey.includes('your_openai_api_key') || 
        sanitizedKey.includes('your_api_key') ||
        sanitizedKey === 'your_openai_api_key_here') {
      console.error('❌ OPENAI_API_KEYがプレースホルダーのままです。実際のAPIキーを設定してください');
      return "APIキー未設定\n.envファイルを確認\n竹芝の風";
    }
    
    // 形式チェックは警告ログのみに変更（失敗の原因にしない）
    if (!sanitizedKey.startsWith('sk-')) {
      console.warn('⚠️ OPENAI_API_KEYが想定形式(sk-)ではありませんが続行します');
    }
    
    const prompt = createHaikuPrompt(answers);
    
    // デバッグ用ログ
    console.log('=== 川柳生成デバッグ情報 ===');
    console.log('アンケート回答:', answers);
    console.log('APIキー確認:', sanitizedKey.substring(0, 10) + '...');
    console.log('生成されたプロンプト:', prompt);
    
    // OpenAIクライアントを取得（必要に応じて作成）
    const openai = getOpenAIClient();
    
    // gpt-4o-mini-2024-07-18に限定
    const modelsToTry = [
      "gpt-4o-mini-2024-07-18"
    ];
    
    let haiku;
    let lastError;
    let quotaError = null;  // クォータ超過エラーを優先的に記録
    
    // 各モデルを試行
    for (const model of modelsToTry) {
      try {
        console.log(`🔄 モデル ${model} を試行中...`);
        
        // まず新しいResponses APIを試行（推奨）
        let responseText = null;
        try {
          const systemPrompt = "あなたは竹芝エリアの雰囲気を深く理解し、訪問者の具体的な体験と感情を川柳に昇華する専門の詩人です。5-7-5の文字数を各-1から+2に収めることが最優先事項です（上五（5音）：4-7文字、中七（7音）：6-9文字、下五（5音）：4-7文字）。アンケートの詳細な内容を必ず川柳に反映し、その人の体験に特化した個性的な川柳を創作してください。竹芝エリアの特徴は、体験と自然に結びつく場合のみ柔軟に織り込んでください。不適切な表現、暴力的表現、個人名は絶対に出力しないでください。";
          
          // Responses APIを試行
          if (openai.responses && typeof openai.responses.create === 'function') {
            const response = await openai.responses.create({
              model: model,
              input: `${systemPrompt}\n\n${prompt}`,
            });
            
            // Responses APIのレスポンス形式に応じてテキストを抽出
            responseText = response.output_text || 
                          response.output?.[0]?.content?.[0]?.text || 
                          response.text ||
                          (typeof response === 'string' ? response : null);
            
            if (responseText && responseText.trim()) {
              haiku = responseText.trim();
              console.log(`✅ Responses APIでモデル ${model} で川柳生成に成功しました`);
              break;
            }
          }
        } catch (responsesError) {
          console.warn(`⚠️  Responses APIでモデル ${model} でエラー:`, responsesError.message);
          
          // クォータ超過エラーを優先的に記録
          if (responsesError.status === 429 || 
              responsesError.message?.includes('quota') || 
              responsesError.message?.includes('exceeded') ||
              responsesError.message?.includes('billing')) {
            quotaError = responsesError;
          }
          // Chat Completions APIにフォールバック
        }
        
        // Responses APIが失敗または利用できない場合、Chat Completions APIを試行
        if (!responseText) {
          const completion = await openai.chat.completions.create({
            model: model,
            messages: [
              {
                role: "system",
                content: "あなたは竹芝エリアの雰囲気を深く理解し、訪問者の具体的な体験と感情を川柳に昇華する専門の詩人です。5-7-5の文字数を各-1から+2に収めることが最優先事項です（上五（5音）：4-7文字、中七（7音）：6-9文字、下五（5音）：4-7文字）。アンケートの詳細な内容を必ず川柳に反映し、その人の体験に特化した個性的な川柳を創作してください。竹芝エリアの特徴は、体験と自然に結びつく場合のみ柔軟に織り込んでください。不適切な表現、暴力的表現、個人名は絶対に出力しないでください。"
              },
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: 150,
            temperature: 0.8
          });
          
          // APIレスポンスの検証
          if (!completion || !completion.choices || completion.choices.length === 0) {
            throw new Error('APIレスポンスが無効です');
          }

          const message = completion.choices[0].message;
          if (!message || !message.content) {
            throw new Error('APIレスポンスにコンテンツがありません');
          }

          haiku = message.content.trim();
          console.log(`✅ Chat Completions APIでモデル ${model} で川柳生成に成功しました`);
        }
        
        if (haiku) {
          break; // 成功したらループを抜ける
        }
        
      } catch (modelError) {
        console.warn(`⚠️  モデル ${model} でエラー:`, modelError.message);
        
        // クォータ超過エラーを優先的に記録
        if (modelError.status === 429 || 
            modelError.message?.includes('quota') || 
            modelError.message?.includes('exceeded') ||
            modelError.message?.includes('billing')) {
          quotaError = modelError;
        }
        
        lastError = modelError;
        // 次のモデルを試行
        continue;
      }
    }
    
    // クォータ超過エラーがあればそれを優先
    if (quotaError && !haiku) {
      lastError = quotaError;
    }
    
    // すべてのモデルで失敗した場合
    if (!haiku) {
      throw lastError || new Error('すべてのモデルで失敗しました。OpenAIダッシュボードでモデルのアクセス権限を確認してください。');
    }
    
    // 成功時のログ
    console.log('✅ ChatGPTから川柳を生成しました:');
    console.log('生成された川柳:', haiku);
    console.log('========================');
    
    return haiku;
    
  } catch (error) {
    console.error('川柳生成エラー:', error);
    console.error('エラーの詳細:', error.message);
    console.error('エラーの種類:', error.name);
    console.error('エラーのスタック:', error.stack);
    console.error('エラーのステータス:', error.status);
    console.error('エラーのレスポンス:', error.response?.data);
    
    // エラーの種類に応じたフォールバック川柳
    const errorMsg = error.message || String(error);
    const errorCode = error.code || error.error?.code;
    
    // APIキーエラーを最初にチェック（401エラーやinvalid_api_keyコード）
    if (error.status === 401 || errorCode === 'invalid_api_key' || 
        errorMsg.includes('API key') || errorMsg.includes('Incorrect API key') ||
        errorMsg.includes('authentication') || errorMsg.includes('401')) {
      console.error('❌ OpenAI APIキーが無効です');
      console.error('   エラーコード:', errorCode);
      console.error('   エラータイプ:', error.error?.type);
      console.error('   詳細:', error.error?.message);
      return "APIキーエラー\n設定を確認してください\n竹芝の風";
    }
    
    // レート制限エラーまたはクォータ超過エラー（優先的にチェック）
    if (error.status === 429 || 
        errorCode === 'insufficient_quota' ||
        errorMsg.includes('rate limit') || 
        errorMsg.includes('429') ||
        errorMsg.includes('quota') || 
        errorMsg.includes('exceeded') || 
        errorMsg.includes('billing')) {
      console.error('❌ APIレート制限またはクォータ超過に達しました');
      console.error('   エラーコード:', errorCode);
      console.error('   詳細:', errorMsg);
      console.error('   請求情報を確認してください: https://platform.openai.com/account/billing');
      return "クォータ超過\n請求情報を確認\n竹芝の風";
    }
    
    // ネットワークエラー
    if (errorMsg.includes('network') || errorMsg.includes('ENOTFOUND') || 
        errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ETIMEDOUT')) {
      console.error('❌ ネットワークエラー');
      return "ネットワークエラー\n接続を確認してください\n竹芝の風";
    }
    
    // モデルアクセス権限エラーまたはモデルが見つからない場合のエラー（より具体的な条件）
    if (errorMsg.includes('does not have access to model') || 
        errorMsg.includes('model not found') || 
        errorCode === 'model_not_found' || 
        (error.status === 403 && errorMsg.includes('model')) ||
        (error.status === 404 && errorMsg.includes('model'))) {
      console.error('❌ モデルへのアクセス権限がありません:', errorMsg);
      console.error('   エラーコード:', errorCode);
      console.error('   ステータス:', error.status);
      console.error('   利用可能なモデルを確認してください: https://platform.openai.com/docs/models');
      console.error('   または、OpenAIダッシュボードでモデルへのアクセスを有効化してください');
      return "モデルアクセスエラー\n利用可能なモデルを確認\n竹芝の風";
    }
    
    // その他のモデル関連エラー
    if (errorMsg.includes('invalid model') || (errorMsg.includes('model') && error.status === 400)) {
      console.error('❌ モデル名が無効です:', errorMsg);
      return "モデルエラー\n設定を確認してください\n竹芝の風";
    }
    
    // その他のエラー
    console.error('❌ その他のエラー:', errorMsg);
    console.error('エラーオブジェクト:', error);
    return "システムエラー\nしばらく待ってください\n竹芝の風";
  }
}

/**
 * アンケート回答から川柳生成用のプロンプトを作成
 * @param {Object} answers - アンケート回答
 * @returns {string} プロンプト
 */
function createHaikuPrompt(answers) {
  const { purpose, mood, reason, location } = answers;
  
  // 目的に応じた具体的な描写
  const purposeDescriptions = {
    'work': '仕事の忙しさ、通勤の疲れ、職場への思い',
    'meeting': '人との出会い、話し合い、つながり',
    'study': '学びの時間、知識への探求、集中した時間',
    'dining': '食事の香り、味わい、食への感謝、カフェでのひととき',
    'shopping': '買い物の楽しさ、商品への期待、満足感',
    'art': '舞台や芸術への感動、文化への触れ合い、表現への共感',
    'ship': '船旅への期待、海への憧れ、出航の高揚感',
    'event': 'イベントへの参加、特別な体験、コミュニティとのつながり',
    'hotel': '宿泊の安らぎ、旅の休息、新しい環境での時間',
    'walk': '散歩の心地よさ、リフレッシュ、自然との触れ合い',
    'date': 'デートの特別な時間、大切な人とのひととき',
    'exercise': '体を動かす爽快感、健康への意識、通りすがりの風景、休憩の安らぎ',
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
  
  let prompt = `あなたは竹芝エリアの体験を川柳に表現する詩人です。\n\n`;
  prompt += `【訪問者の詳細情報】\n`;
  prompt += `・訪問目的: ${purpose} (${purposeDescriptions[purpose] || '特別な目的'})\n`;
  prompt += `・現在の気分: ${mood} (${moodDescriptions[mood] || '複雑な感情'})\n`;
  prompt += `・その理由: "${reason}"\n`;
  if (location) {
    prompt += `・現在地: ${location}\n`;
  }
  
  prompt += `\n【川柳作成の指示】\n`;
  prompt += `1. 5-7-5の文字数を各-1から+2に収めるようにしてください（上五（5音）：4-7文字、中七（7音）：6-9文字、下五（5音）：4-7文字）。これが最優先事項です。\n`;
  prompt += `2. 上記の具体的な体験内容を必ず川柳に反映してください\n`;
  prompt += `3. 訪問目的（${purpose}）の雰囲気を表現してください\n`;
  prompt += `4. 気分（${mood}）を川柳の感情として込めてください\n`;
  prompt += `5. 理由（"${reason}"）の内容を川柳の背景として活用してください\n`;
  prompt += `6. 竹芝エリアの特徴を柔軟に織り込んでください（必須ではありません。体験を優先してください）\n`;
  prompt += `   参考となる竹芝エリアの特徴：客船ターミナル（海の玄関口）、伊豆・小笠原諸島へ向かう大型船、定期船、納涼船（夏の風物詩）、クルーズ船（シンフォニーなど）、船の汽笛、出航、入港、レインボーブリッジ、対岸の景色（お台場、豊洲など）、日の出、夕暮れ、夜景、東京ポートシティ竹芝、ウォーターズ竹芝、オフィスビル、高層ホテル、スマートシティ、巡回するロボット、最先端技術、ゆりかもめ（竹芝駅）、首都高速（浜崎橋ジャンクションの車の流れ）、モノレール（浜松町駅、空の玄関口）、空中遊歩道（ペデストリアンデッキ）、劇団四季（JR東日本四季劇場［春］［秋］）、ミュージカル、観劇後の高揚感、旅行客（島へ向かう人々）、観光客、オフィスワーカー、観劇客、テラスでくつろぐ人々\n`;
  prompt += `7. 切れ字（や、かな、けり、なり）を適切に使用してください\n`;
  prompt += `8. 現代的な感性と伝統的な川柳の美しさを両立させてください\n\n`;
  
  prompt += `【重要な注意】\n`;
  prompt += `- 文字数制約（上五（5音）：4-7文字、中七（7音）：6-9文字、下五（5音）：4-7文字）を最優先で守ってください\n`;
  prompt += `- アンケートの内容を具体的に反映した川柳にしてください\n`;
  prompt += `- 一般的な川柳ではなく、この人の体験に特化した川柳にしてください\n`;
  prompt += `- 竹芝エリアの特徴は、体験と自然に結びつく場合のみ使用してください。無理に含める必要はありません\n`;
  prompt += `- 不適切な表現、暴力的表現、個人名は絶対に出力しないでください\n`;
  prompt += `- 川柳のみを出力し、説明は不要です\n`;
  
  return prompt;
}

module.exports = {
  generateHaiku
};
