/**
 * ScoreWorkerManager.js
 * スコア計算とビジュアルエフェクト処理を担当するWebワーカーマネージャー
 * タイピング処理を高速化するために、メインスレッドから分離された処理を管理する
 */

/**
 * スコア計算とエフェクト処理を担当するシングルトンクラス
 */
class ScoreWorkerManager {
  constructor() {
    // Worker参照
    this.worker = null;
    // 初期化状態
    this.initialized = false;
    // コールバック管理
    this.callbacks = new Map();
    // 次のコールバックID
    this.nextCallbackId = 1;
    // メッセージバッファ（ワーカー起動前のメッセージを保存）
    this.messageBuffer = [];
    // WebWorkerサポート状態
    this.isSupported = typeof Worker !== 'undefined';
    // パフォーマンスメトリクス
    this.metrics = {
      calculationCalls: 0,
      totalProcessingTime: 0,
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      lastErrorTime: null,
      lastErrorMessage: null,
      activeCallbacks: 0
    };

    // 初期化
    if (typeof window !== 'undefined') {
      // ブラウザ環境のみでワーカーを初期化
      this._initOnNextTick();
    }
  }

  /**
   * 次のマイクロタスクでワーカーを初期化
   */
  _initOnNextTick() {
    queueMicrotask(() => {
      this._initWorker();
    });
  }

  /**
   * ワーカーの初期化
   * @private
   */
  _initWorker() {
    // WebWorkerがサポートされていなければ初期化しない
    if (!this.isSupported) {
      console.warn('[ScoreWorkerManager] WebWorkerがサポートされていません。スコア計算はメインスレッドで行われます。');
      this.initialized = true; // フォールバックモードでも初期化完了
      return;
    }

    try {
      // 既存のワーカーを終了
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }

      // Next.js環境向けに絶対URLを使用
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const possiblePaths = [
        `${baseUrl}/workers/score-worker.js`,
        '/workers/score-worker.js',
        './workers/score-worker.js'
      ];

      let workerCreated = false;

      // 順番に試す
      for (const workerPath of possiblePaths) {
        try {
          this.worker = new Worker(workerPath);
          console.log(`[ScoreWorkerManager] Workerを初期化しました: ${workerPath}`);
          workerCreated = true;
          break;
        } catch (pathError) {
          console.warn(`[ScoreWorkerManager] パス ${workerPath} でWorker作成失敗: ${pathError.message}`);
        }
      }

      // すべてのパスで失敗した場合、Web Worker APIを使って直接コードを渡す
      if (!workerCreated) {
        console.log('[ScoreWorkerManager] Inline Workerで初期化を試みます');
        try {
          // インラインワーカーの最小限の実装
          const workerBlob = new Blob([
            `
            // スコア計算ワーカー
            self.onmessage = function(e) {
              const { type, data, callbackId } = e.data;
              
              try {
                switch(type) {
                  case 'calculateScore':
                    const result = calculateScore(data);
                    self.postMessage({ type: 'scoreResult', data: result, callbackId });
                    break;
                    
                  case 'calculateStats':
                    const statsResult = calculateStats(data);
                    self.postMessage({ type: 'statsResult', data: statsResult, callbackId });
                    break;
                    
                  case 'ping':
                    self.postMessage({ 
                      type: 'pong', 
                      data: { received: true, timestamp: Date.now() }, 
                      callbackId 
                    });
                    break;
                    
                  default:
                    throw new Error('不明なメッセージタイプ: ' + type);
                }
              } catch (error) {
                self.postMessage({ 
                  type: 'error', 
                  error: error.message, 
                  callbackId 
                });
              }
            };
            
            // スコア計算関数
            function calculateScore(data) {
              const { correctCount, mistakeCount, elapsedTimeMs } = data;
              
              // KPM計算（キー/分）
              let kpm = 0;
              if (elapsedTimeMs > 0) {
                kpm = Math.floor(correctCount / (elapsedTimeMs / 60000));
              }
              
              // 最低値保証
              if (kpm <= 0 && correctCount > 0) {
                kpm = 1;
              }
              
              // ランク判定
              let rank = 'F';
              if (kpm >= 400) rank = 'S+'; 
              else if (kpm >= 350) rank = 'S';
              else if (kpm >= 300) rank = 'A+';
              else if (kpm >= 250) rank = 'A';
              else if (kpm >= 200) rank = 'B+';
              else if (kpm >= 150) rank = 'B';
              else if (kpm >= 120) rank = 'C+';
              else if (kpm >= 100) rank = 'C';
              else if (kpm >= 80) rank = 'D+';
              else if (kpm >= 60) rank = 'D';
              else if (kpm >= 40) rank = 'E+';
              else if (kpm >= 20) rank = 'E';
              
              // 正確率計算
              const totalKeystrokes = correctCount + mistakeCount;
              const accuracy = totalKeystrokes > 0 ? (correctCount / totalKeystrokes) * 100 : 100;
              
              return {
                kpm,
                rank,
                accuracy: Math.round(accuracy * 100) / 100,
                score: Math.floor(kpm * 100 + (accuracy * 10))
              };
            }
            
            // 統計計算関数
            function calculateStats(data) {
              const { problemStats, correctKeyCount, mistakeCount } = data;
              
              // 問題ごとのKPMの平均値を計算
              let averageKPM = 0;
              if (problemStats && problemStats.length > 0) {
                const validKPMs = problemStats
                  .map(p => p.problemKPM || 0)
                  .filter(kpm => kpm > 0);
                  
                if (validKPMs.length > 0) {
                  averageKPM = validKPMs.reduce((sum, kpm) => sum + kpm, 0) / validKPMs.length;
                }
              }
              
              // 総合統計
              const totalKeystrokes = correctKeyCount + mistakeCount;
              const accuracy = totalKeystrokes > 0 ? (correctKeyCount / totalKeystrokes) * 100 : 100;
              
              return {
                averageKPM,
                totalKeystrokes,
                accuracy: Math.round(accuracy * 100) / 100
              };
            }
            `
          ], { type: 'application/javascript' });
          
          this.worker = new Worker(URL.createObjectURL(workerBlob));
          console.log('[ScoreWorkerManager] インラインWorkerを初期化しました');
          workerCreated = true;
        } catch (inlineError) {
          console.error('[ScoreWorkerManager] インラインWorker作成失敗:', inlineError);
        }
      }

      if (!workerCreated) {
        throw new Error('すべてのワーカー作成方法が失敗しました');
      }

      // メッセージハンドラ設定
      this.worker.onmessage = (e) => this._handleWorkerMessage(e);

      // エラーハンドラ設定
      this.worker.onerror = (error) => {
        console.error('[ScoreWorkerManager] WorkerError:', error);
        this.metrics.lastErrorTime = Date.now();
        this.metrics.lastErrorMessage = error.message || '不明なエラー';
        
        // Worker初期化エラーの場合はフォールバックモードに
        this.worker = null;
        this.initialized = true; // エラーでもフォールバックモードとして初期化完了
      };

      // 初期化確認
      this._postToWorker('ping', { time: Date.now() }, (result) => {
        if (result && result.received) {
          this.initialized = true;
          console.log('[ScoreWorkerManager] ワーカー初期化完了');
          
          // バッファリングされたメッセージを処理
          this._processMessageBuffer();
        }
      });
    } catch (error) {
      console.error('[ScoreWorkerManager] 初期化エラー:', error);
      this.initialized = true; // エラーでもフォールバック用に初期化完了とする
    }
  }

  /**
   * ワーカーメッセージハンドラ
   * @param {MessageEvent} e ワーカーからのメッセージイベント
   */
  _handleWorkerMessage(e) {
    try {
      // メッセージ受信カウント
      this.metrics.totalMessagesReceived++;

      const { type, data, callbackId, error } = e.data;

      // コールバックIDがなければ早期リターン
      if (!callbackId || !this.callbacks.has(callbackId)) {
        if (type !== 'worker_init') {
          console.warn('[ScoreWorkerManager] コールバックが見つかりません:', callbackId);
        }
        return;
      }

      // コールバックを取得して削除
      const callback = this.callbacks.get(callbackId);
      this.callbacks.delete(callbackId);
      this.metrics.activeCallbacks--;

      // エラーチェック
      if (error) {
        callback(null, new Error(error));
        return;
      }

      // 結果を返す
      callback(data);
    } catch (error) {
      console.error('[ScoreWorkerManager] メッセージ処理エラー:', error);
    }
  }

  /**
   * ワーカーにメッセージを送信
   * @param {string} type メッセージタイプ
   * @param {*} data 送信データ
   * @param {Function} callback コールバック関数
   */
  _postToWorker(type, data, callback) {
    try {
      // ワーカーが初期化されていなければバッファリング
      if (!this.initialized) {
        this.messageBuffer.push({ type, data, callback });
        return;
      }

      // ワーカーがない場合はメインスレッドで処理
      if (!this.worker) {
        this._processOnMainThread(type, data, callback);
        return;
      }

      // コールバックIDを生成
      const callbackId = this.nextCallbackId++;

      // コールバック登録
      if (callback) {
        this.callbacks.set(callbackId, callback);
        this.metrics.activeCallbacks++;
      }

      // メッセージ送信
      this.worker.postMessage({ type, data, callbackId });
      this.metrics.totalMessagesSent++;

    } catch (error) {
      console.error('[ScoreWorkerManager] メッセージ送信エラー:', error);
      if (callback) callback(null, error);
    }
  }

  /**
   * バッファリングされたメッセージを処理
   */
  _processMessageBuffer() {
    if (this.messageBuffer.length > 0) {
      // バッファリングされたメッセージを全て処理
      for (const message of this.messageBuffer) {
        const { type, data, callback } = message;
        this._postToWorker(type, data, callback);
      }
      
      // バッファをクリア
      this.messageBuffer = [];
    }
  }

  /**
   * メインスレッドでの処理（フォールバック用）
   */
  _processOnMainThread(type, data, callback) {
    try {
      const startTime = performance.now();
      
      let result;
      switch (type) {
        case 'calculateScore':
          result = this._calculateScoreOnMainThread(data);
          break;
          
        case 'calculateStats':
          result = this._calculateStatsOnMainThread(data);
          break;
          
        case 'ping':
          result = { received: true, timestamp: Date.now() };
          break;
          
        default:
          throw new Error('不明なメッセージタイプ: ' + type);
      }
      
      const processingTime = performance.now() - startTime;
      this.metrics.totalProcessingTime += processingTime;
      
      if (callback) callback(result);
    } catch (error) {
      console.error('[ScoreWorkerManager] メインスレッド処理エラー:', error);
      if (callback) callback(null, error);
    }
  }

  /**
   * メインスレッドでのスコア計算（フォールバック用）
   */
  _calculateScoreOnMainThread(data) {
    const { correctCount, mistakeCount, elapsedTimeMs } = data;
    
    // KPM計算（キー/分）
    let kpm = 0;
    if (elapsedTimeMs > 0) {
      kpm = Math.floor(correctCount / (elapsedTimeMs / 60000));
    }
    
    // 最低値保証
    if (kpm <= 0 && correctCount > 0) {
      kpm = 1;
    }
    
    // ランク判定
    let rank = 'F';
    if (kpm >= 400) rank = 'S+'; 
    else if (kpm >= 350) rank = 'S';
    else if (kpm >= 300) rank = 'A+';
    else if (kpm >= 250) rank = 'A';
    else if (kpm >= 200) rank = 'B+';
    else if (kpm >= 150) rank = 'B';
    else if (kpm >= 120) rank = 'C+';
    else if (kpm >= 100) rank = 'C';
    else if (kpm >= 80) rank = 'D+';
    else if (kpm >= 60) rank = 'D';
    else if (kpm >= 40) rank = 'E+';
    else if (kpm >= 20) rank = 'E';
    
    // 正確率計算
    const totalKeystrokes = correctCount + mistakeCount;
    const accuracy = totalKeystrokes > 0 ? (correctCount / totalKeystrokes) * 100 : 100;
    
    return {
      kpm,
      rank,
      accuracy: Math.round(accuracy * 100) / 100,
      score: Math.floor(kpm * 100 + (accuracy * 10))
    };
  }

  /**
   * メインスレッドでの統計計算（フォールバック用）
   */
  _calculateStatsOnMainThread(data) {
    const { problemStats, correctKeyCount, mistakeCount } = data;
    
    // 問題ごとのKPMの平均値を計算
    let averageKPM = 0;
    if (problemStats && problemStats.length > 0) {
      const validKPMs = problemStats
        .map(p => p.problemKPM || 0)
        .filter(kpm => kpm > 0);
        
      if (validKPMs.length > 0) {
        averageKPM = validKPMs.reduce((sum, kpm) => sum + kpm, 0) / validKPMs.length;
      }
    }
    
    // 総合統計
    const totalKeystrokes = correctKeyCount + mistakeCount;
    const accuracy = totalKeystrokes > 0 ? (correctKeyCount / totalKeystrokes) * 100 : 100;
    
    return {
      averageKPM,
      totalKeystrokes,
      accuracy: Math.round(accuracy * 100) / 100
    };
  }

  /**
   * スコア計算
   * @param {Object} data スコア計算用データ
   * @param {number} data.correctCount 正解キー数
   * @param {number} data.mistakeCount ミス数
   * @param {number} data.elapsedTimeMs 経過時間（ミリ秒）
   * @returns {Promise<Object>} スコア計算結果
   */
  calculateScore(data) {
    return new Promise((resolve, reject) => {
      this.metrics.calculationCalls++;
      this._postToWorker('calculateScore', data, (result, error) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * 統計データの計算
   * @param {Object} data 統計計算用データ
   * @returns {Promise<Object>} 統計計算結果
   */
  calculateStats(data) {
    return new Promise((resolve, reject) => {
      this.metrics.calculationCalls++;
      this._postToWorker('calculateStats', data, (result, error) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * パフォーマンスメトリクスを取得
   * @returns {Object} パフォーマンスメトリクス
   */
  getMetrics() {
    return {
      ...this.metrics,
      initialized: this.initialized,
      hasWorker: !!this.worker,
      callbacksCount: this.callbacks.size,
      timestamp: Date.now()
    };
  }

  /**
   * リソースのクリーンアップ
   */
  cleanup() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.callbacks.clear();
    this.messageBuffer = [];
    this.initialized = false;
    
    console.log('[ScoreWorkerManager] リソースをクリーンアップしました');
  }
}

// シングルトンインスタンス
const scoreWorkerManager = new ScoreWorkerManager();

export default scoreWorkerManager;
