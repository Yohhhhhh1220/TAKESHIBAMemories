// 統合ページのJavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Socket.IO接続（開発環境のみ）
    let socket;
    if (typeof io !== 'undefined') {
        socket = io();
    }
    
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
    
    // 初期化
    loadHaikuGallery();
    setupEventListeners();
    setupMoodSelection();
    
    // Socket.IOでリアルタイム俳句を受信（開発環境のみ）
    if (socket) {
        socket.on('new-haiku', function(data) {
            // リアルタイムで新しい俳句が来た場合は先頭に追加
            const haikuItem = document.createElement('div');
            haikuItem.className = 'haiku-item';
            const penname = data.penname || '詠み人知らず';
            
            // 俳句を3行に整形
            const lines = formatHaikuToThreeLines(data.haiku || '俳句を生成中...');
            const validLines = lines.filter(line => line && line.trim() !== '');
            const finalLines = validLines.length >= 3 ? validLines.slice(0, 3) : 
                              validLines.length === 2 ? [...validLines, ''] :
                              validLines.length === 1 ? [validLines[0], '', ''] : ['', '', ''];
            
            haikuItem.innerHTML = `
                <div class="haiku-text">${finalLines.join('\n')}</div>
                <div class="haiku-meta">
                    <div class="haiku-penname">✍️ ${penname}</div>
                    <div class="haiku-timestamp">${new Date(data.timestamp || data.created_at || new Date()).toLocaleString('ja-JP')}</div>
                </div>
            `;
            haikuGallery.insertBefore(haikuItem, haikuGallery.firstChild);
        });
    }
    
    // 定期的に俳句一覧を更新
    setInterval(loadHaikuGallery, 30000); // 30秒ごと
    
    /**
     * 文字数をカウントする関数（俳句の音数計算）
     */
    function countMorae(text) {
        if (!text) return 0;
        let count = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            // ひらがな・カタカナ・漢字は基本的に1音
            if (/[ぁ-んァ-ン一-龯々]/.test(char)) {
                count++;
            }
            // 長音記号は音数に含めない（前の文字と合わせて1音）
            else if (char === 'ー' || char === '−') {
                // 前の文字と合わせて1音として扱うため、カウントしない
            }
            // その他の文字（句読点、スペースなど）は音数に含めない
        }
        return count;
    }

    /**
     * 俳句を5-7-5の3行に整形する関数
     */
    function formatHaikuToThreeLines(haikuText) {
        if (!haikuText || haikuText.trim() === '') {
            return ['俳句を生成中...', '', ''];
        }
        
        // 既存の改行がある場合は、その改行を保持して確認
        const originalLines = haikuText.trim().split(/[\n\r]+/).filter(line => line.trim() !== '');
        
        // 既に3行になっていて、5-7-5に近い場合はそのまま使用
        if (originalLines.length === 3) {
            const count1 = countMorae(originalLines[0]);
            const count2 = countMorae(originalLines[1]);
            const count3 = countMorae(originalLines[2]);
            // 5-7-5に近い場合（許容範囲：±2音）
            if (Math.abs(count1 - 5) <= 2 && Math.abs(count2 - 7) <= 2 && Math.abs(count3 - 5) <= 2) {
                return originalLines;
            }
        }
        
        // 既存の改行を除去して1行に
        const cleaned = haikuText.trim().replace(/\s+/g, '').replace(/[\n\r]+/g, '');
        
        if (cleaned.length === 0) {
            return ['', '', ''];
        }
        
        // 全体の文字列から5-7-5に分割
        const totalLength = cleaned.length;
        // 5:7:5の比率で分割（全体が17音を想定）
        const ratio1 = 5 / 17;  // 最初の5音分
        const ratio2 = 12 / 17; // 最初の12音分（5+7）
        
        let pos1 = Math.floor(totalLength * ratio1);
        let pos2 = Math.floor(totalLength * ratio2);
        
        // 句読点や切れ字の近くで調整
        const findBestSplitPoint = (targetPos, text, range = 5) => {
            let bestPos = targetPos;
            let bestDistance = range;
            
            // まず句読点や切れ字の後を探す
            for (let i = Math.max(0, targetPos - range); i < Math.min(text.length, targetPos + range); i++) {
                if (/[、。やかなけりなり]/.test(text[i])) {
                    const distance = Math.abs(targetPos - i);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestPos = i + 1;
                    }
                }
            }
            
            // 見つからない場合は、空白や区切り文字の後を探す
            if (bestPos === targetPos) {
                for (let i = Math.max(0, targetPos - range); i < Math.min(text.length, targetPos + range); i++) {
                    if (/[\s　]/.test(text[i])) {
                        const distance = Math.abs(targetPos - i);
                        if (distance < bestDistance) {
                            bestDistance = distance;
                            bestPos = i + 1;
                        }
                    }
                }
            }
            
            return bestPos;
        };
        
        pos1 = findBestSplitPoint(pos1, cleaned);
        pos2 = findBestSplitPoint(pos2, cleaned, 8);
        
        // 3行に分割（必ず3行になるようにする）
        const line1 = cleaned.substring(0, pos1).trim() || '';
        const line2 = cleaned.substring(pos1, pos2).trim() || '';
        const line3 = cleaned.substring(pos2).trim() || '';
        
        // 空行が含まれている場合は、均等に再分配
        if (!line1 || !line2 || !line3) {
            // 全体を3等分する
            const part1 = Math.ceil(totalLength / 3);
            const part2 = Math.ceil(totalLength * 2 / 3);
            return [
                cleaned.substring(0, part1).trim() || '',
                cleaned.substring(part1, part2).trim() || '',
                cleaned.substring(part2).trim() || ''
            ];
        }
        
        return [line1, line2, line3];
    }
    
    /**
     * イベントリスナーの設定
     */
    function setupEventListeners() {
        // フォーム送信処理
        form.addEventListener('submit', handleFormSubmit);
        
        // ボタンイベント
        shareBtn.addEventListener('click', shareHaiku);
        newHaikuBtn.addEventListener('click', resetForm);
        
    }
    
    
    /**
     * 感情選択の設定
     */
    function setupMoodSelection() {
        const moodOptions = document.querySelectorAll('.mood-option');
        const moodInput = document.getElementById('mood');
        
        moodOptions.forEach(option => {
            let isTouching = false;
            
            // クリックイベント（デスクトップ用）
            option.addEventListener('click', function(e) {
                if (!isTouching) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('クリックイベント:', this.dataset.mood);
                    selectMood(this, moodOptions, moodInput);
                }
            });
            
            // タッチイベント（モバイル用）
            option.addEventListener('touchstart', function(e) {
                isTouching = true;
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
                this.style.backgroundColor = '#f8f9ff';
                console.log('タッチ開始:', this.dataset.mood);
            }, { passive: false });
            
            option.addEventListener('touchend', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('タッチ終了:', this.dataset.mood);
                // 少し遅延させてタッチイベントを確実に処理
                setTimeout(() => {
                    selectMood(this, moodOptions, moodInput);
                }, 10);
                isTouching = false;
                this.style.transform = '';
                this.style.backgroundColor = '';
            }, { passive: false });
            
            option.addEventListener('touchcancel', function(e) {
                isTouching = false;
                this.style.transform = '';
                this.style.backgroundColor = '';
                console.log('タッチキャンセル');
            });
            
            // マウスイベント（デスクトップ用の視覚的フィードバック）
            option.addEventListener('mousedown', function(e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
                this.style.backgroundColor = '#f8f9ff';
            });
            
            option.addEventListener('mouseup', function(e) {
                e.preventDefault();
                this.style.transform = '';
                this.style.backgroundColor = '';
            });
            
            option.addEventListener('mouseleave', function(e) {
                this.style.transform = '';
                this.style.backgroundColor = '';
            });
            
            // キーボードアクセシビリティ
            option.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectMood(this, moodOptions, moodInput);
                }
            });
        });
    }
    
    /**
     * 気分選択の共通処理
     */
    function selectMood(option, moodOptions, moodInput) {
        console.log('感情ボタンが押されました:', option.dataset.mood);
        
        // 既に選択されているボタンを再度押した場合、選択を解除
        if (option.classList.contains('selected')) {
            console.log('選択を解除します');
            option.classList.remove('selected');
            resetMoodOptionStyle(option);
            moodInput.value = '';
            return;
        }
        
        // 他の選択を解除
        moodOptions.forEach(opt => {
            opt.classList.remove('selected');
            resetMoodOptionStyle(opt);
        });
        
        // この選択をアクティブに
        option.classList.add('selected');
        console.log('選択状態を追加:', option.classList.contains('selected'));
        
        // 隠しフィールドに値を設定
        moodInput.value = option.dataset.mood;
        console.log('選択された感情:', moodInput.value);
        
        // モバイルでの視覚的フィードバック
        if (window.innerWidth <= 768) {
            option.style.transform = 'scale(0.95)';
            setTimeout(() => {
                option.style.transform = '';
            }, 200);
        }
    }
    
    /**
     * 感情ボタンのスタイルをリセット
     */
    function resetMoodOptionStyle(option) {
        // インラインスタイルをクリアしてCSSクラスに委ねる
        option.style.transform = '';
        option.style.backgroundColor = '';
        option.style.borderColor = '';
        option.style.background = '';
        option.style.color = '';
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
                    locationId: 'takeshiba-station', // デフォルト値（後で削除可能）
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
            
            const response = await fetch('/api/haikus');
            
            // レスポンスのステータスを確認
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('APIエラー:', response.status, errorData);
                
                // エラーメッセージを表示
                if (response.status === 503) {
                    haikuGallery.innerHTML = '<p class="error-message">データベース接続エラーが発生しました。しばらく待ってから再度お試しください。</p>';
                } else {
                    haikuGallery.innerHTML = '<p class="error-message">俳句の読み込みに失敗しました。エラーコード: ' + response.status + '</p>';
                }
                return;
            }
            
            const data = await response.json();
            
            // データが存在するか確認
            if (data && Array.isArray(data.haikus)) {
                displayHaikuGallery(data.haikus);
            } else if (data && data.haikus === undefined) {
                // レスポンスにhaikusプロパティがない場合
                console.warn('レスポンスにhaikusプロパティがありません:', data);
                displayHaikuGallery([]);
            } else {
                displayHaikuGallery(data.haikus || []);
            }
            
        } catch (error) {
            console.error('俳句ギャラリー読み込みエラー:', error);
            console.error('エラーの詳細:', error.message);
            haikuGallery.innerHTML = '<p class="error-message">俳句の読み込みに失敗しました。ネットワークエラーの可能性があります。</p>';
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }
    
    /**
     * 俳句ギャラリーを表示
     */
    function displayHaikuGallery(haikus) {
        haikuGallery.innerHTML = '';
        
        if (!haikus || haikus.length === 0) {
            haikuGallery.innerHTML = '<p class="no-haikus">まだ俳句がありません。最初の俳句を作ってみませんか？</p>';
            return;
        }
        
        // 最新順にソート（表示数の制限なし - 全ての俳句を表示）
        haikus.sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));
        
        // 全ての俳句を表示（制限なし）
        console.log(`俳句を表示中: ${haikus.length}件`);
        haikus.forEach((haiku, index) => {
            addHaikuToGallery(haiku);
        });
    }
    
    /**
     * 俳句をギャラリーに追加
     */
    function addHaikuToGallery(haikuData) {
        // 重複チェックを緩和：同じ俳句でも日時やペンネームが異なる場合は表示
        // IDがある場合はIDで、ない場合は俳句テキスト+日時+ペンネームで判定
        const existingItems = haikuGallery.querySelectorAll('.haiku-item');
        const haikuId = haikuData.id || haikuData.survey_id;
        const haikuTimestamp = haikuData.timestamp || haikuData.created_at;
        const haikuPenname = haikuData.penname || '詠み人知らず';
        
        for (let item of existingItems) {
            const itemId = item.dataset.haikuId;
            const itemText = item.querySelector('.haiku-text').textContent;
            
            // IDがある場合はIDで判定
            if (haikuId && itemId && haikuId.toString() === itemId) {
                return; // 同じIDの場合は追加しない
            }
            
            // IDがない場合は、テキスト+日時+ペンネームで判定（より厳密に）
            if (!haikuId && itemText === haikuData.haiku) {
                const itemTimestamp = item.dataset.timestamp;
                const itemPenname = item.dataset.penname;
                
                // 同じテキスト、同じ日時、同じペンネームの場合は重複として扱う
                if (itemTimestamp === haikuTimestamp && itemPenname === haikuPenname) {
                    return;
                }
            }
        }
    
        const haikuItem = document.createElement('div');
        haikuItem.className = 'haiku-item';
        
        // データ属性を追加して重複チェックに使用
        if (haikuId) {
            haikuItem.dataset.haikuId = haikuId.toString();
        }
        haikuItem.dataset.timestamp = haikuTimestamp;
        haikuItem.dataset.penname = haikuPenname;
        
        // 俳句を3行に整形
        const lines = formatHaikuToThreeLines(haikuData.haiku || '俳句を生成中...');
        const validLines = lines.filter(line => line && line.trim() !== '');
        const finalLines = validLines.length >= 3 ? validLines.slice(0, 3) : 
                          validLines.length === 2 ? [...validLines, ''] :
                          validLines.length === 1 ? [validLines[0], '', ''] : ['', '', ''];
        
        haikuItem.innerHTML = `
            <div class="haiku-text">${finalLines.join('\n')}</div>
            <div class="haiku-meta">
                <div class="haiku-penname">✍️ ${haikuPenname}</div>
                <div class="haiku-timestamp">${new Date(haikuTimestamp).toLocaleString('ja-JP')}</div>
            </div>
        `;
        
        // 末尾に追加（新しい順にソート済みなので、末尾に追加すれば新しいものが上に表示される）
        haikuGallery.appendChild(haikuItem);
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
    
});