const EventEmitter = require('events');

class MusicStreamService extends EventEmitter {
    constructor() {
        super();
        this.activeStreams = new Map(); // locationId -> stream info
        this.musicQueue = new Map(); // locationId -> music queue
    }

    /**
     * 場所での音楽ストリームを開始
     * @param {string} locationId - 場所ID
     * @param {Object} musicData - 音楽データ
     */
    startStream(locationId, musicData) {
        try {
            // 既存のストリームがあれば停止
            this.stopStream(locationId);
            
            const streamInfo = {
                locationId,
                musicData,
                startTime: new Date(),
                isPlaying: true,
                loopCount: 0
            };
            
            this.activeStreams.set(locationId, streamInfo);
            
            // 音楽キューに追加
            if (!this.musicQueue.has(locationId)) {
                this.musicQueue.set(locationId, []);
            }
            this.musicQueue.get(locationId).push(musicData);
            
            // ストリーム開始イベントを発火
            this.emit('stream-started', streamInfo);
            
            // 音楽の長さに応じてループ処理を設定
            const duration = musicData.duration || 30; // デフォルト30秒
            setTimeout(() => {
                this.handleStreamLoop(locationId);
            }, duration * 1000);
            
            console.log(`音楽ストリーム開始: ${locationId}`);
            
        } catch (error) {
            console.error('音楽ストリーム開始エラー:', error);
            this.emit('stream-error', { locationId, error });
        }
    }

    /**
     * 場所での音楽ストリームを停止
     * @param {string} locationId - 場所ID
     */
    stopStream(locationId) {
        const streamInfo = this.activeStreams.get(locationId);
        if (streamInfo) {
            streamInfo.isPlaying = false;
            this.activeStreams.delete(locationId);
            this.emit('stream-stopped', { locationId });
            console.log(`音楽ストリーム停止: ${locationId}`);
        }
    }

    /**
     * ストリームのループ処理
     * @param {string} locationId - 場所ID
     */
    handleStreamLoop(locationId) {
        const streamInfo = this.activeStreams.get(locationId);
        if (!streamInfo || !streamInfo.isPlaying) {
            return;
        }

        // ループカウントを増加
        streamInfo.loopCount++;
        
        // 最大ループ数をチェック（例：10回まで）
        if (streamInfo.loopCount >= 10) {
            this.stopStream(locationId);
            return;
        }

        // 次の音楽をキューから取得
        const queue = this.musicQueue.get(locationId);
        if (queue && queue.length > 0) {
            const nextMusic = queue.shift(); // 最初の音楽を取得して削除
            this.startStream(locationId, nextMusic);
        } else {
            // キューが空の場合は現在の音楽をループ
            const duration = streamInfo.musicData.duration || 30;
            setTimeout(() => {
                this.handleStreamLoop(locationId);
            }, duration * 1000);
        }
    }

    /**
     * 音楽をキューに追加
     * @param {string} locationId - 場所ID
     * @param {Object} musicData - 音楽データ
     */
    addToQueue(locationId, musicData) {
        if (!this.musicQueue.has(locationId)) {
            this.musicQueue.set(locationId, []);
        }
        
        this.musicQueue.get(locationId).push(musicData);
        
        // 現在ストリームが停止している場合は開始
        if (!this.activeStreams.has(locationId)) {
            this.startStream(locationId, musicData);
        }
        
        console.log(`音楽をキューに追加: ${locationId}`);
    }

    /**
     * 場所の現在のストリーム情報を取得
     * @param {string} locationId - 場所ID
     * @returns {Object|null} ストリーム情報
     */
    getStreamInfo(locationId) {
        return this.activeStreams.get(locationId) || null;
    }

    /**
     * 全てのアクティブストリームを取得
     * @returns {Array} ストリーム情報の配列
     */
    getAllActiveStreams() {
        return Array.from(this.activeStreams.values());
    }

    /**
     * 場所の音楽キューを取得
     * @param {string} locationId - 場所ID
     * @returns {Array} 音楽キューの配列
     */
    getMusicQueue(locationId) {
        return this.musicQueue.get(locationId) || [];
    }

    /**
     * 音楽キューをクリア
     * @param {string} locationId - 場所ID
     */
    clearQueue(locationId) {
        this.musicQueue.set(locationId, []);
        console.log(`音楽キューをクリア: ${locationId}`);
    }

    /**
     * 全てのストリームを停止
     */
    stopAllStreams() {
        for (const locationId of this.activeStreams.keys()) {
            this.stopStream(locationId);
        }
        console.log('全ての音楽ストリームを停止しました');
    }

    /**
     * ストリーム統計を取得
     * @returns {Object} 統計情報
     */
    getStatistics() {
        const activeCount = this.activeStreams.size;
        const totalQueues = this.musicQueue.size;
        const totalMusicInQueues = Array.from(this.musicQueue.values())
            .reduce((total, queue) => total + queue.length, 0);

        return {
            activeStreams: activeCount,
            totalQueues: totalQueues,
            totalMusicInQueues: totalMusicInQueues,
            streams: this.getAllActiveStreams()
        };
    }
}

// シングルトンインスタンス
const musicStreamService = new MusicStreamService();

module.exports = musicStreamService;
