// 川柳表示ページのJavaScript
let currentHaikuData = null; // 現在の川柳データを保持

document.addEventListener('DOMContentLoaded', function() {
    // URLから川柳IDを取得
    const pathParts = window.location.pathname.split('/');
    const haikuId = pathParts[pathParts.length - 1];
    
    // 川柳データを読み込み
    loadHaiku(haikuId);
    
    // ボタンイベント
    document.getElementById('share-btn').addEventListener('click', shareHaiku);
    document.getElementById('new-survey-btn').addEventListener('click', () => {
        window.location.href = '/';
    });
    
    // ウィンドウリサイズ時に表示を更新
    window.addEventListener('resize', function() {
        if (currentHaikuData) {
            displayHaikuText(currentHaikuData.haiku);
        }
    });
});

/**
 * 川柳データを読み込み
 */
async function loadHaiku(haikuId) {
    try {
        const response = await fetch(`/api/haiku/${haikuId}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // 川柳データを保持
        currentHaikuData = data;
        
        // 川柳を表示（モバイルで縦書き対応）
        displayHaikuText(data.haiku || '川柳を生成中...');
        
        // メタデータを表示
        if (data.created_at) {
            document.getElementById('timestamp').textContent = 
                new Date(data.created_at).toLocaleString('ja-JP');
        }
        
        const penname = data.penname || '詠み人知らず';
        document.getElementById('penname').textContent = `✍️ ${penname}`;
        
        // 音楽機能は削除されました
        
    } catch (error) {
        console.error('川柳読み込みエラー:', error);
        document.getElementById('haiku-text').textContent = 
            '川柳の読み込みに失敗しました。';
    }
}

/**
 * 川柳テキストを表示（モバイルで縦書き対応）
 */
function displayHaikuText(haikuText) {
    const haikuTextElement = document.getElementById('haiku-text');
    
    // モバイルデバイスの場合、行ごとに分割して縦書き表示
    if (window.innerWidth <= 768) {
        const lines = haikuText.split(/\n/).filter(line => line.trim() !== '');
        if (lines.length > 1) {
            // 複数行の場合、各行を縦書き用のspanで囲む
            haikuTextElement.innerHTML = lines.map(line => 
                `<span class="haiku-line">${line.trim()}</span>`
            ).join('');
        } else {
            // 1行の場合、そのまま表示
            haikuTextElement.textContent = haikuText;
        }
    } else {
        // デスクトップの場合、通常の表示
        haikuTextElement.textContent = haikuText;
    }
}

// 音楽機能は削除されました

/**
 * 川柳を共有
 */
function shareHaiku() {
    const haikuText = document.getElementById('haiku-text').textContent;
    const url = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: '竹芝川柳音楽システム',
            text: haikuText,
            url: url
        });
    } else {
        // フォールバック: クリップボードにコピー
        const shareText = `${haikuText}\n\n竹芝川柳音楽システム\n${url}`;
        navigator.clipboard.writeText(shareText).then(() => {
            alert('川柳をクリップボードにコピーしました！');
        }).catch(() => {
            alert('共有機能が利用できません。');
        });
    }
}
