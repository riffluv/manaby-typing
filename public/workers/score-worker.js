/**
 * score-worker.js
 * スコア計算を行うWebWorker
 * メインスレッドから分離してスコア計算を実行
 */

// 起動時に初期化メッセージを送信
self.postMessage({
  type: 'worker_ready',
  timestamp: Date.now()
});

// ワーカー初期化メッセージ
self.onmessage = function (e) {
  const { type, data, callbackId } = e.data;
  
  // 受信ログ（デバッグ用）
  //console.log('[Worker] メッセージ受信:', type);

  try {
    switch (type) {
      case 'calculate':
        // スコア計算処理
        const result = calculateScore(data);
        self.postMessage({
          type: 'calculate',
          result,
          callbackId,
          success: true,
          timestamp: Date.now()
        });
        break;

      case 'ping':
        // 疎通確認
        self.postMessage({
          type: 'pong',
          callbackId,
          received: true,
          timestamp: Date.now()
        });
        break;

      case 'setProcessingModes':
        // 処理モード設定（互換性用）
        self.postMessage({
          type: 'setProcessingModes',
          callbackId,
          success: true
        });
        break;

      default:
        throw new Error(`未知のメッセージタイプ: ${type}`);
    }
  } catch (error) {
    // エラー発生時
    self.postMessage({
      type: 'error',
      error: error.message,
      callbackId,
      timestamp: Date.now()
    });
  }
};

/**
 * スコア計算を実行
 * @param {Object} data スコア計算データ
 * @returns {Object} 計算結果
 */
function calculateScore(data) {
  const {
    correctKeyCount = 0,
    missCount = 0,
    typingTime = 0, // ミリ秒
    textLength = 0,
    level = 'normal'
  } = data;

  // 基本スコア計算
  let baseScore = 0;
  let wpm = 0;
  let accuracy = 100;

  if (typingTime > 0) {
    // WPM計算 (1分あたりのタイプ数)
    const minutes = typingTime / 60000;
    wpm = Math.round(correctKeyCount / minutes);

    // 正確性計算
    const totalKeyPresses = correctKeyCount + missCount;
    if (totalKeyPresses > 0) {
      accuracy = Math.round((correctKeyCount / totalKeyPresses) * 100);
    }

    // 基本スコア = WPM * 精度補正
    baseScore = Math.round(wpm * (accuracy / 100));

    // 複雑なスコア計算（WebWorkerの利点を示すため、意図的に計算負荷を上げる）
    // 通常はこのような重い処理は必要ありませんが、デモのために実装
    for (let i = 0; i < 10000; i++) {
      baseScore = Math.sqrt(baseScore * baseScore + i % 10);
    }
    baseScore = Math.round(baseScore);
  }

  // 難易度による補正
  let levelMultiplier = 1;
  switch (level) {
    case 'easy': levelMultiplier = 0.8; break;
    case 'normal': levelMultiplier = 1; break;
    case 'hard': levelMultiplier = 1.2; break;
    case 'expert': levelMultiplier = 1.5; break;
  }

  // 最終スコア計算
  const finalScore = Math.round(baseScore * levelMultiplier);

  return {
    score: finalScore,
    wpm,
    accuracy,
    level,
    correctKeyCount,
    missCount,
    typingTime
  };
}

// ワーカー起動通知
self.postMessage({
  type: 'worker_ready',
  timestamp: Date.now()
});
