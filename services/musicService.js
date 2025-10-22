const axios = require('axios');

/**
 * 俳句に基づいて音楽を生成
 * @param {string} haiku - 俳句テキスト
 * @returns {Promise<Object>} 音楽データ
 */
async function generateMusic(haiku) {
  try {
    console.log('=== 音楽生成開始 ===');
    console.log('俳句:', haiku);
    
    // 複数の音楽生成APIを試行
    const musicData = await tryMultipleMusicAPIs(haiku);
    
    console.log('✅ 音楽生成成功:', musicData);
    return musicData;
    
  } catch (error) {
    console.error('音楽生成エラー:', error);
    console.error('エラーの詳細:', error.message);
    
    // フォールバック: 静かなアンビエント音
    return {
      audioUrl: null,
      duration: 30,
      metadata: {
        prompt: '静かなアンビエント音',
        haiku: haiku,
        generatedAt: new Date(),
        fallback: true,
        error: error.message
      }
    };
  }
}

/**
 * 複数の音楽生成APIを試行
 * @param {string} haiku - 俳句テキスト
 * @returns {Promise<Object>} 音楽データ
 */
async function tryMultipleMusicAPIs(haiku) {
  const musicPrompt = createMusicPrompt(haiku);
  
  // 1. Suno APIを試行
  if (process.env.SUNO_API_KEY) {
    try {
      console.log('Suno APIを試行中...');
      return await generateWithSunoAPI(musicPrompt, haiku);
    } catch (error) {
      console.warn('Suno API失敗:', error.message);
    }
  }
  
  // 2. ローカル音楽生成（フォールバック）
  console.log('ローカル音楽生成を使用');
  return generateLocalMusic(haiku, musicPrompt);
}

/**
 * Suno APIを使用して音楽を生成
 * @param {string} prompt - 音楽プロンプト
 * @param {string} haiku - 俳句テキスト
 * @returns {Promise<Object>} 音楽データ
 */
async function generateWithSunoAPI(prompt, haiku) {
  console.log('Suno APIリクエスト開始...');
  console.log('プロンプト:', prompt);
  
  const response = await axios.post('https://api.sunoapi.com/v1/suno/create', {
    custom_mode: true,
    gpt_description_prompt: prompt,
    make_instrumental: true,
    mv: "chirp-v4"
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.SUNO_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 60000 // 60秒タイムアウトに延長
  });

  console.log('Suno APIレスポンス:', response.data);
  
  // 音楽生成の完了を待つ
  if (response.data.id) {
    console.log('音楽生成ID:', response.data.id);
    console.log('音楽生成完了を待機中...');
    
    // 生成完了まで待機（最大2分）
    const audioUrl = await waitForMusicGeneration(response.data.id);
    
    return {
      audioUrl: audioUrl,
      duration: 30,
      metadata: {
        prompt: prompt,
        haiku: haiku,
        generatedAt: new Date(),
        api: 'suno',
        generationId: response.data.id
      }
    };
  } else {
    throw new Error('Suno APIからIDが返されませんでした');
  }
}

/**
 * 音楽生成の完了を待機
 * @param {string} generationId - 生成ID
 * @returns {Promise<string>} 音楽URL
 */
async function waitForMusicGeneration(generationId) {
  const maxAttempts = 12; // 最大12回（2分）
  const delay = 10000; // 10秒間隔
  
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`音楽生成確認中... (${i + 1}/${maxAttempts})`);
    
    try {
      const response = await axios.get(`https://api.sunoapi.com/v1/suno/get/${generationId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUNO_API_KEY}`
        }
      });
      
      console.log('生成状況:', response.data);
      
      if (response.data.audio_url) {
        console.log('✅ 音楽生成完了！');
        return response.data.audio_url;
      }
      
      if (response.data.status === 'error') {
        throw new Error('音楽生成に失敗しました');
      }
      
      // 10秒待機
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      console.warn('生成状況確認エラー:', error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('音楽生成がタイムアウトしました');
}

/**
 * ローカル音楽生成（フォールバック）
 * @param {string} haiku - 俳句テキスト
 * @param {string} prompt - 音楽プロンプト
 * @returns {Object} 音楽データ
 */
function generateLocalMusic(haiku, prompt) {
  // 俳句の内容に基づいて音楽の特徴を決定
  const mood = extractMoodFromHaiku(haiku);
  const season = extractSeasonFromHaiku(haiku);
  const location = extractLocationFromHaiku(haiku);
  
  // 音楽の特徴を生成
  const musicFeatures = {
    mood: mood,
    season: season,
    location: location,
    tempo: getTempoFromMood(mood),
    instruments: getInstrumentsFromMood(mood),
    key: getKeyFromMood(mood)
  };
  
  console.log('生成された音楽特徴:', musicFeatures);
  
  return {
    audioUrl: null, // 実際の音楽ファイルは生成されない
    duration: 30,
    metadata: {
      prompt: prompt,
      haiku: haiku,
      generatedAt: new Date(),
      api: 'local',
      features: musicFeatures,
      fallback: true
    }
  };
}

/**
 * 俳句から音楽生成用のプロンプトを作成
 * @param {string} haiku - 俳句テキスト
 * @returns {string} 音楽プロンプト
 */
function createMusicPrompt(haiku) {
  // 俳句の内容を分析して音楽の雰囲気を決定
  const mood = extractMoodFromHaiku(haiku);
  const season = extractSeasonFromHaiku(haiku);
  const location = extractLocationFromHaiku(haiku);
  
  let prompt = `Create ambient music for Takeshiba area based on this haiku: "${haiku}"`;
  
  if (mood) {
    prompt += ` Mood: ${mood}`;
  }
  if (season) {
    prompt += ` Season: ${season}`;
  }
  if (location) {
    prompt += ` Location: ${location}`;
  }
  
  prompt += `. The music should be peaceful, contemplative, and suitable for a public space.`;
  
  return prompt;
}

/**
 * 俳句から感情を抽出
 * @param {string} haiku - 俳句テキスト
 * @returns {string} 感情
 */
function extractMoodFromHaiku(haiku) {
  const positiveWords = ['喜び', '笑顔', '光', '希望', '暖か', '美し', '楽しい'];
  const negativeWords = ['悲し', '寂し', '暗い', '冷た', '重い', '苦し'];
  const neutralWords = ['静か', '穏やか', '落ち着い', '自然', '風', '空'];
  
  const haikuLower = haiku.toLowerCase();
  
  if (positiveWords.some(word => haiku.includes(word))) {
    return 'joyful';
  } else if (negativeWords.some(word => haiku.includes(word))) {
    return 'melancholic';
  } else if (neutralWords.some(word => haiku.includes(word))) {
    return 'peaceful';
  }
  
  return 'contemplative';
}

/**
 * 俳句から季節を抽出
 * @param {string} haiku - 俳句テキスト
 * @returns {string} 季節
 */
function extractSeasonFromHaiku(haiku) {
  const springWords = ['桜', '花', '新緑', '春'];
  const summerWords = ['夏', '暑', '青空', '海'];
  const autumnWords = ['秋', '紅葉', '涼', '月'];
  const winterWords = ['冬', '雪', '寒', '静寂'];
  
  if (springWords.some(word => haiku.includes(word))) return 'spring';
  if (summerWords.some(word => haiku.includes(word))) return 'summer';
  if (autumnWords.some(word => haiku.includes(word))) return 'autumn';
  if (winterWords.some(word => haiku.includes(word))) return 'winter';
  
  return 'neutral';
}

/**
 * 俳句から場所を抽出
 * @param {string} haiku - 俳句テキスト
 * @returns {string} 場所
 */
function extractLocationFromHaiku(haiku) {
  const seaWords = ['海', '波', '潮', '船', '港'];
  const cityWords = ['街', 'ビル', '人', '通り'];
  const natureWords = ['風', '空', '雲', '鳥'];
  
  if (seaWords.some(word => haiku.includes(word))) return 'seaside';
  if (cityWords.some(word => haiku.includes(word))) return 'urban';
  if (natureWords.some(word => haiku.includes(word))) return 'natural';
  
  return 'mixed';
}

/**
 * 気分からテンポを決定
 * @param {string} mood - 気分
 * @returns {number} テンポ（BPM）
 */
function getTempoFromMood(mood) {
  const tempoMap = {
    'joyful': 120,
    'peaceful': 60,
    'excited': 140,
    'contemplative': 80,
    'melancholic': 70,
    'energetic': 130
  };
  return tempoMap[mood] || 90;
}

/**
 * 気分から楽器を決定
 * @param {string} mood - 気分
 * @returns {Array} 楽器の配列
 */
function getInstrumentsFromMood(mood) {
  const instrumentMap = {
    'joyful': ['piano', 'strings', 'flute'],
    'peaceful': ['piano', 'strings', 'harp'],
    'excited': ['drums', 'bass', 'electric_guitar'],
    'contemplative': ['piano', 'cello', 'flute'],
    'melancholic': ['piano', 'violin', 'cello'],
    'energetic': ['drums', 'bass', 'synthesizer']
  };
  return instrumentMap[mood] || ['piano', 'strings'];
}

/**
 * 気分からキーを決定
 * @param {string} mood - 気分
 * @returns {string} キー
 */
function getKeyFromMood(mood) {
  const keyMap = {
    'joyful': 'C major',
    'peaceful': 'F major',
    'excited': 'G major',
    'contemplative': 'A minor',
    'melancholic': 'D minor',
    'energetic': 'E major'
  };
  return keyMap[mood] || 'C major';
}

module.exports = {
  generateMusic
};
