/**
 * ScoreWorkerManager.js
 * スコア計算を担当するマネージャークラス
 * WebWorker機能を削除し、メインスレッド処理のみに簡略化
 */

/**
 * スコア計算を担当するシングルトンクラス
 * WebWorker機能を削除し、メインスレッド処理のみを行う簡略化バージョン
 */
class ScoreWorkerManager {
  constructor() {    // コールバック管理
    this.callbacks = new Map();
    // 次のコールバックID
    this.nextCallbackId = 1;
    // 処理モード設定
    this.processingMode = {
      calculation: 'main-thread', // スコア計算モード
      effects: 'main-thread'      // エフェクト処理モード
    };
    // パフォーマンスメトリクス
    this.metrics = {
      calculationCalls: 0,
      totalProcessingTime: 0
    };

    console.log('[ScoreWorkerManager] メインスレッドモードで初期化しました');
  }

  /**
   * スコア計算を実行
   * @param {Object} data スコアデータ
   * @param {Function} callback コールバック関数
   */
  calculateScore(data, callback) {
    const startTime = performance.now();

    try {
      // メインスレッドでのスコア計算処理
      const result = this._calculateScoreOnMainThread(data);

      // コールバック実行
      if (callback) {
        callback(result);
      }

      // メトリクス更新
      this.metrics.calculationCalls++;
      this.metrics.totalProcessingTime += performance.now() - startTime;
    } catch (error) {
      console.error('[ScoreWorkerManager] スコア計算エラー:', error);
      if (callback) {
        callback({ error: error.message, score: 0 });
      }
    }
  }

  /**
   * メインスレッドでのスコア計算（シンプル実装）
   * @param {Object} data スコア計算データ
   * @returns {Object} 計算結果
   * @private
   */
  _calculateScoreOnMainThread(data) {
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
  /**
   * メトリクスを取得
   * @returns {Object} パフォーマンスメトリクス
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * 処理モードを設定する
   * @param {Object} modes 各処理のモード設定
   * @returns {Object} 現在の設定
   */
  setProcessingModes(modes) {
    console.log('[ScoreWorkerManager] 処理モード設定:', modes);

    // 必要なプロパティのみ更新
    if (modes.calculation) {
      this.processingMode.calculation = 'main-thread'; // WebWorker削除のため常にmain-thread
    }
    if (modes.effects) {
      this.processingMode.effects = 'main-thread'; // WebWorker削除のため常にmain-thread
    }

    return {
      success: true,
      currentModes: { ...this.processingMode }
    };
  }

  /**
   * シングルトンインスタンスを取得
   * @returns {ScoreWorkerManager} シングルトンインスタンス
   */
  static getInstance() {
    if (!this.instance) {
      this.instance = new ScoreWorkerManager();
    }
    return this.instance;
  }
}

// シングルトンインスタンスをエクスポート
export default ScoreWorkerManager.getInstance();
