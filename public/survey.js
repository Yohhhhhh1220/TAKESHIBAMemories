// アンケートページのJavaScript
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('survey-form');
    const submitBtn = document.getElementById('submit-btn');
    const resultSection = document.getElementById('result-section');
    const haikuDisplay = document.getElementById('haiku-display');
    const musicPlayer = document.getElementById('music-player');
    
    // URLから場所IDを取得
    const pathParts = window.location.pathname.split('/');
    const locationId = pathParts[pathParts.length - 1];
    
    // Socket.IO接続
    const socket = io();
    socket.emit('join-location', locationId);
    
    // フォーム送信処理
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const answers = {
            purpose: formData.get('purpose'),
            mood: formData.get('mood'),
            reason: formData.get('reason'),
            penname: formData.get('penname') || '詠み人知らず'
        };
        
        // バリデーション
        if (!answers.purpose || !answers.mood || !answers.reason) {
            alert('すべての項目を入力してください。');
            return;
        }
        
        // 送信ボタンを無効化
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loading').style.display = 'inline';
        
        try {
            const response = await fetch('/api/survey', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    locationId: locationId,
                    answers: answers
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 俳句を表示
                haikuDisplay.textContent = result.haiku;
                resultSection.style.display = 'block';
                
                // ページを少し下にスクロール
                resultSection.scrollIntoView({ behavior: 'smooth' });
                
                // 俳句ページへのリンクを追加
                setTimeout(() => {
                    const haikuLink = document.createElement('a');
                    haikuLink.href = `/haiku/${result.surveyId}`;
                    haikuLink.textContent = '俳句を詳しく見る';
                    haikuLink.className = 'action-btn';
                    haikuLink.style.display = 'inline-block';
                    haikuLink.style.marginTop = '20px';
                    resultSection.appendChild(haikuLink);
                }, 2000);
                
            } else {
                throw new Error(result.error || 'アンケート処理中にエラーが発生しました');
            }
            
        } catch (error) {
            console.error('アンケート送信エラー:', error);
            alert('エラーが発生しました。もう一度お試しください。');
        } finally {
            // 送信ボタンを有効化
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').style.display = 'inline';
            submitBtn.querySelector('.btn-loading').style.display = 'none';
        }
    });
    
    // リアルタイム俳句受信
    socket.on('new-haiku', function(data) {
        if (data.haiku) {
            haikuDisplay.textContent = data.haiku;
            resultSection.style.display = 'block';
        }
    });
});

// 音楽機能は削除されました
