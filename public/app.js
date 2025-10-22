// 統合ページのJavaScript
document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    
    // フォーム要素の取得
    const form = document.getElementById('survey-form');
    const submitBtn = document.getElementById('submit-btn');
    const resultSection = document.getElementById('result-section');
    const haikuDisplay = document.getElementById('haiku-display');
    const shareBtn = document.getElementById('share-btn');
    const newHaikuBtn = document.getElementById('new-haiku-btn');
    
    // 俳句ギャラリー要素の取得
    const haikuGallery = document.getElementById('haiku-gallery');
    const loadingIndicator = document.getElementById('loading-indicator');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // 現在のフィルター
    let currentFilter = 'all';
    
    // 初期化
    loadHaikuGallery();
    setupEventListeners();
    setupMoodSelection();
    handleLocationParameter();
    
    // Socket.IOでリアルタイム俳句を受信
    socket.on('new-haiku', function(data) {
        addHaikuToGallery(data);
    });
    
    // 定期的に俳句一覧を更新
    setInterval(loadHaikuGallery, 30000); // 30秒ごと
    
    /**
     * イベントリスナーの設定
     */
    function setupEventListeners() {
        // フォーム送信処理
        form.addEventListener('submit', handleFormSubmit);
        
        // ボタンイベント
        shareBtn.addEventListener('click', shareHaiku);
        newHaikuBtn.addEventListener('click', resetForm);
        
        // フィルターボタン
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // アクティブ状態を更新
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // フィルターを更新
                currentFilter = this.dataset.location;
                loadHaikuGallery();
            });
        });
    }
    
    /**
     * 感情選択の設定
     */
    function setupMoodSelection() {
        const moodOptions = document.querySelectorAll('.mood-option');
        const moodInput = document.getElementById('mood');
        
        moodOptions.forEach(option => {
            option.addEventListener('click', function() {
                // 他の選択を解除
                moodOptions.forEach(opt => opt.classList.remove('selected'));
                
                // この選択をアクティブに
                this.classList.add('selected');
                
                // 隠しフィールドに値を設定
                moodInput.value = this.dataset.mood;
            });
        });
    }
    
    /**
     * フォーム送信処理
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const answers = {
            purpose: formData.get('purpose'),
            mood: formData.get('mood'),
            reason: formData.get('reason'),
            location: formData.get('location') || 'takeshiba-station'
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
                    locationId: answers.location,
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
                
                // ギャラリーを更新
                loadHaikuGallery();
                
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
}

/**
     * 俳句ギャラリーを読み込み
     */
    async function loadHaikuGallery() {
        try {
            loadingIndicator.style.display = 'block';
            
            // フィルターに応じてAPIエンドポイントを選択
            let apiUrl = '/api/haikus';
            if (currentFilter !== 'all') {
                apiUrl = `/api/location/${currentFilter}/haikus`;
            }
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.haikus) {
                displayHaikuGallery(data.haikus);
            }
            
        } catch (error) {
            console.error('俳句ギャラリー読み込みエラー:', error);
            haikuGallery.innerHTML = '<p class="error-message">俳句の読み込みに失敗しました。</p>';
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }
    
    /**
     * 俳句ギャラリーを表示
     */
    function displayHaikuGallery(haikus) {
        haikuGallery.innerHTML = '';
        
        if (haikus.length === 0) {
            haikuGallery.innerHTML = '<p class="no-haikus">まだ俳句がありません。最初の俳句を作ってみませんか？</p>';
            return;
        }
        
        // 最新順にソートして最新6つのみを表示
        haikus.sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));
        
        // 最新6つの俳句のみを表示
        haikus.slice(0, 6).forEach(haiku => {
            addHaikuToGallery(haiku);
        });
    }
    
    /**
     * 俳句をギャラリーに追加
     */
    function addHaikuToGallery(haikuData) {
        // 既存の俳句と重複していないかチェック
        const existingItems = haikuGallery.querySelectorAll('.haiku-item');
        for (let item of existingItems) {
            const existingText = item.querySelector('.haiku-text').textContent;
            if (existingText === haikuData.haiku) {
                return; // 重複している場合は追加しない
            }
        }
    
    const haikuItem = document.createElement('div');
    haikuItem.className = 'haiku-item';
    haikuItem.innerHTML = `
        <div class="haiku-text">${haikuData.haiku || '俳句を生成中...'}</div>
        <div class="haiku-meta">
                <div class="haiku-location">${getLocationName(haikuData.location_id)}</div>
                <div class="haiku-timestamp">${new Date(haikuData.timestamp || haikuData.created_at).toLocaleString('ja-JP')}</div>
        </div>
    `;
    
    // 先頭に追加
        haikuGallery.insertBefore(haikuItem, haikuGallery.firstChild);
    
    // 最大6個まで表示
        const items = haikuGallery.querySelectorAll('.haiku-item');
    if (items.length > 6) {
            haikuGallery.removeChild(items[items.length - 1]);
        }
    }
    
    /**
     * 俳句を共有
     */
    function shareHaiku() {
        const haikuText = haikuDisplay.textContent;
        const url = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: 'TAKESHIBA Memories',
                text: haikuText,
                url: url
            });
        } else {
            // フォールバック: クリップボードにコピー
            const shareText = `${haikuText}\n\nTAKESHIBA Memories\n${url}`;
            navigator.clipboard.writeText(shareText).then(() => {
                alert('俳句をクリップボードにコピーしました！');
            }).catch(() => {
                alert('共有機能が利用できません。');
            });
        }
    }
    
    /**
     * フォームをリセット
     */
    function resetForm() {
        form.reset();
        resultSection.style.display = 'none';
        
        // 感情選択をリセット
        const moodOptions = document.querySelectorAll('.mood-option');
        moodOptions.forEach(opt => opt.classList.remove('selected'));
        
        form.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * URLパラメータから場所を自動選択
     */
    function handleLocationParameter() {
        const urlParams = new URLSearchParams(window.location.search);
        const location = urlParams.get('location');
        
        if (location) {
            const locationSelect = document.getElementById('location');
            if (locationSelect) {
                locationSelect.value = location;
                
                // 場所が選択されたことをユーザーに通知
                const locationNames = {
                    'garden': '庭',
                    'chair': '椅子',
                    'exhibition': '展示室',
                    'elevator': 'エレベーター',
                    'restaurant': 'レストラン',
                    'other': 'その他'
                };
                
                const locationName = locationNames[location] || location;
                showLocationNotification(locationName);
            }
        }
    }
    
    /**
     * 場所選択通知を表示
     */
    function showLocationNotification(locationName) {
        // 通知要素を作成
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
            z-index: 1000;
            font-size: 1rem;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = `📍 ${locationName} が選択されました`;
        
        // アニメーション用CSSを追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        // 通知を表示
        document.body.appendChild(notification);
        
        // 3秒後に自動で削除
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * 場所名を取得
     */
    function getLocationName(locationId) {
        const locationNames = {
            'garden': '庭',
            'chair': '椅子',
            'exhibition': '展示室',
            'elevator': 'エレベーター',
            'restaurant': 'レストラン',
            'other': 'その他'
        };
        return locationNames[locationId] || locationId || '不明な場所';
    }
});