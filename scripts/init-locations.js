const { generateMultipleQRCodes } = require('../services/qrService');
const { saveLocation } = require('../services/databaseService');

// 竹芝エリアの場所データ
const locations = [
  {
    id: 'takeshiba-station',
    name: '竹芝駅',
    description: '竹芝エリアの交通の要所。多くの人が行き交う場所です。'
  },
  {
    id: 'takeshiba-pier',
    name: '竹芝桟橋',
    description: '海辺の風景が美しい桟橋。潮風と海の音が心地よい場所です。'
  },
  {
    id: 'takeshiba-park',
    name: '竹芝公園',
    description: '緑豊かな公園。憩いの場として多くの人が利用しています。'
  },
  {
    id: 'takeshiba-building',
    name: '竹芝ビル',
    description: '商業施設が集まるビル。活気ある商業エリアです。'
  }
];

/**
 * 初期化スクリプトを実行
 */
async function initializeLocations() {
  try {
    console.log('竹芝エリアの場所を初期化しています...');
    
    // QRコードを生成
    const qrCodes = await generateMultipleQRCodes(locations);
    
    // 場所情報をデータベースに保存
    for (const location of locations) {
      await saveLocation(location);
      console.log(`場所を保存しました: ${location.name}`);
    }
    
    console.log('初期化が完了しました！');
    console.log('生成されたQRコード:');
    qrCodes.forEach(qr => {
      if (qr.error) {
        console.error(`エラー (${qr.locationId}): ${qr.error}`);
      } else {
        console.log(`✓ ${qr.locationName}: ${qr.qrUrl}`);
      }
    });
    
  } catch (error) {
    console.error('初期化エラー:', error);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  initializeLocations();
}

module.exports = { initializeLocations, locations };
