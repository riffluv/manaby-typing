/**
 * score-worker.js
 * スコア計算と統計処理を担当するWebワーカー
 * メインスレッドの処理を妨げずに動作するよう最適化
 */

// 初期設定
const DEBUG = false;
const METRICS_ENABLED = true;

// メトリクス
const metrics = {
  calculateScoreCalls: 0,
  calculateStatsCalls: 0,
  totalProcessingTime: 0,
  lastReset: Date.now()
};

// 初期化メッセージ
self.postMessage({
  type: 'worker_init',
  data: {
    status: 'initialized',
    timestamp: Date.now()
  }
});

/**
 * メッセージハンドラー
 */
self.onmessage = function(e) {
  try {
    const { type, data, callbackId } = e.data;
    
    // 処理時間計測開始
    const startTime = performance.now();
    
    // タイプに応じた処理
    switch(type) {
      case 'calculateScore':
        // スコア計算
        handleCalculateScore(data, callbackId);
        break;
        
      case 'calculateStats':
        // 統計計算
        handleCalculateStats(data, callbackId);
        break;
        
      case 'ping':
        // 疎通確認
        self.postMessage({
          type: 'pong',
          data: {
            received: true,
            timestamp: Date.now(),
            originalTime: data.time
          },
          callbackId
        });
        break;
        
      case 'getMetrics':
        // メトリクス取得
        if (METRICS_ENABLED) {
          self.postMessage({
            type: 'metricsResult',
            data: { ...metrics, currentTime: Date.now() },
            callbackId
          });
        }
        break;
        
      default:
        throw new Error('不明なメッセージタイプ: ' + type);
    }
    
    // 処理時間計測・記録
    if (METRICS_ENABLED) {
      const processingTime = performance.now() - startTime;
      metrics.totalProcessingTime += processingTime;
    }
  } catch (error) {
    console.error('[ScoreWorker] エラー:', error);
    
    // エラー応答
    if (e.data && e.data.callbackId) {
      self.postMessage({
        type: 'error',
        error: error.message,
        callbackId: e.data.callbackId
      });
    }
  }
};

/**
 * スコア計算処理
 */
function handleCalculateScore(data, callbackId) {
  if (METRICS_ENABLED) {
    metrics.calculateScoreCalls++;
  }

  const result = calculateScore(data);
  
  self.postMessage({
    type: 'scoreResult',
    data: result,
    callbackId
  });
}

/**
 * 統計計算処理
 */
function handleCalculateStats(data, callbackId) {
  if (METRICS_ENABLED) {
    metrics.calculateStatsCalls++;
  }

  const result = calculateStats(data);
  
  self.postMessage({
    type: 'statsResult',
    data: result,
    callbackId
  });
}

/**
 * スコア計算関数
 * @param {Object} data 計算用データ
 */
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
  
  // スコア計算 - KPMと精度からスコアを算出
  const score = Math.floor(kpm * 100 + (accuracy * 10));
  
  // デバッグ出力
  if (DEBUG) {
    console.log('[ScoreWorker] スコア計算結果:', { 
      kpm, rank, accuracy, score, 
      input: { correctCount, mistakeCount, elapsedTimeMs } 
    });
  }
  
  return {
    kpm,
    rank,
    accuracy: Math.round(accuracy * 100) / 100,
    score
  };
}

/**
 * 統計計算関数
 * @param {Object} data 計算用データ
 */
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
  
  // ランク判定
  let rank = 'F';
  if (averageKPM >= 400) rank = 'S+'; 
  else if (averageKPM >= 350) rank = 'S';
  else if (averageKPM >= 300) rank = 'A+';
  else if (averageKPM >= 250) rank = 'A';
  else if (averageKPM >= 200) rank = 'B+';
  else if (averageKPM >= 150) rank = 'B';
  else if (averageKPM >= 120) rank = 'C+';
  else if (averageKPM >= 100) rank = 'C';
  else if (averageKPM >= 80) rank = 'D+';
  else if (averageKPM >= 60) rank = 'D';
  else if (averageKPM >= 40) rank = 'E+';
  else if (averageKPM >= 20) rank = 'E';
  
  // デバッグ出力
  if (DEBUG) {
    console.log('[ScoreWorker] 統計計算結果:', { 
      averageKPM, accuracy, rank, totalKeystrokes,
      problemCount: problemStats?.length || 0
    });
  }
  
  return {
    averageKPM: Math.round(averageKPM * 10) / 10,
    totalKeystrokes,
    accuracy: Math.round(accuracy * 100) / 100,
    rank
  };
}
