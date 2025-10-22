const fs = require('fs');
const path = require('path');

/**
 * プロジェクトのセットアップを実行
 */
async function setup() {
  console.log('🎋 竹芝俳句音楽システムのセットアップを開始します...\n');
  
  try {
    // 1. 必要なディレクトリを作成
    console.log('📁 必要なディレクトリを作成中...');
    const directories = [
      'public/qr-codes',
      'database',
      'logs'
    ];
    
    for (const dir of directories) {
      const dirPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✓ ${dir} ディレクトリを作成しました`);
      } else {
        console.log(`✓ ${dir} ディレクトリは既に存在します`);
      }
    }
    
    // 2. .envファイルの確認
    console.log('\n🔧 環境設定ファイルを確認中...');
    const envPath = path.join(__dirname, '..', '.env');
    const envExamplePath = path.join(__dirname, '..', 'env.example');
    
    if (!fs.existsSync(envPath)) {
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✓ .envファイルを作成しました（env.exampleからコピー）');
        console.log('⚠️  .envファイルを編集してAPIキーを設定してください');
      } else {
        console.log('⚠️  env.exampleファイルが見つかりません');
      }
    } else {
      console.log('✓ .envファイルは既に存在します');
    }
    
    // 3. データベースの初期化
    console.log('\n🗄️  データベースを初期化中...');
    const { initializeLocations } = require('./init-locations');
    await initializeLocations();
    
    // 4. セットアップ完了メッセージ
    console.log('\n🎉 セットアップが完了しました！');
    console.log('\n📋 次のステップ:');
    console.log('1. .envファイルを編集してAPIキーを設定してください');
    console.log('2. npm start でサーバーを起動してください');
    console.log('3. http://localhost:3000 にアクセスしてください');
    console.log('\n🔑 必要なAPIキー:');
    console.log('- OpenAI API Key (ChatGPT用)');
    console.log('- Google MusicFX API Key (音楽生成用)');
    console.log('\n📚 詳細な使用方法は README.md を参照してください');
    
  } catch (error) {
    console.error('❌ セットアップ中にエラーが発生しました:', error.message);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  setup();
}

module.exports = { setup };
