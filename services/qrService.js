const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

/**
 * QRコードを生成してファイルに保存
 * @param {string} url - QRコードに含めるURL
 * @param {string} filename - 保存するファイル名
 * @returns {Promise<string>} 保存されたファイルのパス
 */
async function generateQRCode(url, filename) {
  try {
    // QRコードのオプション設定
    const options = {
      type: 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 512
    };
    
    // QRコードを生成
    const qrCodeDataURL = await QRCode.toDataURL(url, options);
    
    // DataURLからBufferに変換
    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 保存先ディレクトリを作成
    const qrDir = path.join(__dirname, '..', 'public', 'qr-codes');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }
    
    // ファイルに保存
    const filePath = path.join(qrDir, filename);
    fs.writeFileSync(filePath, buffer);
    
    console.log(`✅ QRコードを生成しました: ${filename}`);
    return `/qr-codes/${filename}`;
    
  } catch (error) {
    console.error('QRコード生成エラー:', error);
    throw error;
  }
}

/**
 * 場所別のQRコードを生成
 * @param {string} baseUrl - ベースURL（例: https://yourdomain.com）
 * @returns {Promise<Array>} 生成されたQRコードの情報
 */
async function generateLocationQRCodes(baseUrl) {
  const locations = [
    { id: 'garden', name: '庭', filename: 'qr-garden.png' },
    { id: 'chair', name: '椅子', filename: 'qr-chair.png' },
    { id: 'exhibition', name: '展示室', filename: 'qr-exhibition.png' },
    { id: 'elevator', name: 'エレベーター', filename: 'qr-elevator.png' },
    { id: 'restaurant', name: 'レストラン', filename: 'qr-restaurant.png' }
  ];
  
  const results = [];
  
  for (const location of locations) {
    try {
      // 各場所のURLを生成（場所パラメータ付き）
      const url = `${baseUrl}?location=${location.id}`;
      const qrPath = await generateQRCode(url, location.filename);
      
      results.push({
        locationId: location.id,
        locationName: location.name,
        url: url,
        qrPath: qrPath,
        filename: location.filename
      });
    } catch (error) {
      console.error(`${location.name}のQRコード生成エラー:`, error);
    }
  }
  
  return results;
}

/**
 * メインサイトのQRコードを生成
 * @param {string} baseUrl - ベースURL
 * @returns {Promise<string>} QRコードのパス
 */
async function generateMainQRCode(baseUrl) {
  try {
    const qrPath = await generateQRCode(baseUrl, 'qr-main.png');
    console.log(`✅ メインQRコードを生成しました: ${qrPath}`);
    return qrPath;
  } catch (error) {
    console.error('メインQRコード生成エラー:', error);
    throw error;
  }
}

module.exports = {
  generateQRCode,
  generateLocationQRCodes,
  generateMainQRCode
};