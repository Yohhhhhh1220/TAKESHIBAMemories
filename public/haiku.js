// 俳句表示ページのJavaScript
document.addEventListener('DOMContentLoaded', function() {
    // URLから俳句IDを取得
    const pathParts = window.location.pathname.split('/');
    const haikuId = pathParts[pathParts.length - 1];
    
    // 俳句データを読み込み
    loadHaiku(haikuId);
    
    // ボタンイベント
    document.getElementById('share-btn').addEventListener('click', shareHaiku);
    document.getElementById('new-survey-btn').addEventListener('click', () => {
        window.location.href = '/';
    });
});

/**
 * 俳句データを読み込み
 */
async function loadHaiku(haikuId) {
    try {
        const response = await fetch(`/api/haiku/${haikuId}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // 俳句を表示
        document.getElementById('haiku-text').textContent = data.haiku || '俳句を生成中...';
        
        // メタデータを表示
        if (data.created_at) {
            document.getElementById('timestamp').textContent = 
                new Date(data.created_at).toLocaleString('ja-JP');
        }
        
        const penname = data.penname || '詠み人知らず';
        document.getElementById('penname').textContent = `✍️ ${penname}`;
        
        // 音楽機能は削除されました
        
    } catch (error) {
        console.error('俳句読み込みエラー:', error);
        document.getElementById('haiku-text').textContent = 
            '俳句の読み込みに失敗しました。';
    }
}

// 音楽機能は削除されました

/**
 * 俳句を共有
 */
function shareHaiku() {
    const haikuText = document.getElementById('haiku-text').textContent;
    const url = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: '竹芝俳句音楽システム',
            text: haikuText,
            url: url
        });
    } else {
        // フォールバック: クリップボードにコピー
        const shareText = `${haikuText}\n\n竹芝俳句音楽システム\n${url}`;
        navigator.clipboard.writeText(shareText).then(() => {
            alert('俳句をクリップボードにコピーしました！');
        }).catch(() => {
            alert('共有機能が利用できません。');
        });
    }
}
