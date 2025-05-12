/**
 * ScoreCalculationWorker.js
 * スコア計算をバックグラウンドで行うWorker
 * 2025年5月12日作成
 */

import { createInlineWorker, isWorkerAvailable } from './WorkerUtils';

// Worker内部で実行する関数
const scoreCalcFunction = () => {
  // Worker内のメソッド定義
  return {
    /**
     * Worker内でKPM（キー/分）を計算
     * @param {Object} stats 統計情報
     * @returns {Object} KPM情報
     */
    calculateKPM(stats) {
      if (!stats || !stats.keyCount || !stats.elapsedTimeMs) {
        return { kpm: 0, rank: 'F' };
      }

      try {
        // KPM = キー数 / 分
        const minutes = stats.elapsedTimeMs / 60000;
        const kpm = Math.floor(stats.keyCount / minutes);

        // ランクの計算
        let rank = 'F';
        if (kpm >= 400) rank = 'S';
        else if (kpm >= 300) rank = 'A';
        else if (kpm >= 200) rank = 'B';
        else if (kpm >= 150) rank = 'C';
        else if (kpm >= 100) rank = 'D';
        else if (kpm >= 50) rank = 'E';        // 精度計算用の内部関数
        const calcAccuracy = (statData) => {
          if (!statData || !statData.correctKeyCount || !statData.totalKeyCount) {
            return 0;
          }
          const accuracy = (statData.correctKeyCount / statData.totalKeyCount) * 100;
          return Math.min(Math.max(0, Math.round(accuracy * 10) / 10), 100);
        };

        // 追加の計算（実行環境が許せばここで重い処理も可能）
        return {
          kpm,
          rank,
          normalized: Math.min(kpm, 600),
          accuracy: stats.accuracy || calcAccuracy(stats),
          timeStamp: new Date().toISOString(),
          isWorker: true
        };
      } catch (error) {
        console.error('Worker内でのKPM計算エラー:', error);
        return { kpm: 0, rank: 'F', error: error.message };
      }
    },

    /**
     * 問題ごとの平均KPMを計算
     * @param {Array} problemStats 問題統計の配列
     * @returns {Object} KPM情報
     */
    calculateAverageKPM(problemStats) {
      if (!Array.isArray(problemStats) || problemStats.length === 0) {
        return { kpm: 0, rank: 'F' };
      }

      try {
        // 有効な問題データのみ抽出
        const validProblems = problemStats.filter(problem =>
          problem &&
          problem.problemKeyCount > 0 &&
          problem.problemElapsedMs > 0
        );

        if (validProblems.length === 0) {
          return { kpm: 0, rank: 'F' };
        }

        // 問題ごとにKPMを計算
        const kpmValues = validProblems.map(problem => {
          const keyCount = problem.problemKeyCount || 0;
          const elapsedTimeMs = problem.problemElapsedMs || 0;

          if (keyCount <= 0 || elapsedTimeMs <= 0) return 0;

          // KPM = キー数 / 時間(分)
          return keyCount / (elapsedTimeMs / 60000);
        });

        // KPMの平均値を計算
        const totalKpm = kpmValues.reduce((sum, kpm) => sum + kpm, 0);
        const averageKpm = Math.floor(kpmValues.length > 0 ? totalKpm / kpmValues.length : 0);

        // ランクの計算
        let rank = 'F';
        if (averageKpm >= 400) rank = 'S';
        else if (averageKpm >= 300) rank = 'A';
        else if (averageKpm >= 200) rank = 'B';
        else if (averageKpm >= 150) rank = 'C';
        else if (averageKpm >= 100) rank = 'D';
        else if (averageKpm >= 50) rank = 'E';

        // 合理的な最大値でKPMをキャップ（600が現実的な上限）
        const normalizedKpm = Math.min(averageKpm, 600);

        return {
          kpm: normalizedKpm,
          rank,
          rawKpm: averageKpm,
          sampleCount: validProblems.length,
          timeStamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('Worker内での平均KPM計算エラー:', error);
        return { kpm: 0, rank: 'F', error: error.message };
      }
    },

    /**
     * 精度計算
     * @param {Object} stats 統計情報
     * @returns {number} 精度（0-100）
     */
    calculateAccuracy(stats) {
      if (!stats || !stats.correctKeyCount || !stats.totalKeyCount) {
        return 0;
      }

      try {
        const accuracy = (stats.correctKeyCount / stats.totalKeyCount) * 100;
        return Math.min(Math.max(0, Math.round(accuracy * 10) / 10), 100); // 小数点第1位まで
      } catch (error) {
        console.error('Worker内での精度計算エラー:', error);
        return 0;
      }
    }
  };
};

// フォールバック実装（Workerが使えない環境用）
const fallbackImpl = {
  /**
   * KPM（キー/分）を計算（フォールバック）
   * @param {Object} stats 統計情報
   * @returns {Object} KPM情報
   */
  calculateKPM(stats) {
    if (!stats || !stats.keyCount || !stats.elapsedTimeMs) {
      return { kpm: 0, rank: 'F' };
    }

    // KPM = キー数 / 分
    const minutes = stats.elapsedTimeMs / 60000;
    const kpm = Math.floor(stats.keyCount / minutes);

    // ランクの計算
    let rank = 'F';
    if (kpm >= 400) rank = 'S';
    else if (kpm >= 300) rank = 'A';
    else if (kpm >= 200) rank = 'B';
    else if (kpm >= 150) rank = 'C';
    else if (kpm >= 100) rank = 'D';
    else if (kpm >= 50) rank = 'E';    // 内部精度計算関数
    const calculateAccuracy = (statData) => {
      if (!statData || !statData.correctKeyCount || !statData.totalKeyCount) {
        return 0;
      }
      const accuracy = (statData.correctKeyCount / statData.totalKeyCount) * 100;
      return Math.min(Math.max(0, Math.round(accuracy * 10) / 10), 100);
    };
    
    return {
      kpm,
      rank,
      normalized: Math.min(kpm, 600),
      accuracy: stats.accuracy || calculateAccuracy(stats),
      timeStamp: new Date().toISOString(),
      isWorker: false
    };
  },

  /**
   * 問題ごとの平均KPMを計算（フォールバック）
   * @param {Array} problemStats 問題統計の配列
   * @returns {Object} KPM情報
   */
  calculateAverageKPM(problemStats) {
    if (!Array.isArray(problemStats) || problemStats.length === 0) {
      return { kpm: 0, rank: 'F' };
    }

    // 有効な問題データのみ抽出
    const validProblems = problemStats.filter(problem =>
      problem &&
      problem.problemKeyCount > 0 &&
      problem.problemElapsedMs > 0
    );

    if (validProblems.length === 0) {
      return { kpm: 0, rank: 'F' };
    }

    // 問題ごとにKPMを計算
    const kpmValues = validProblems.map(problem => {
      const keyCount = problem.problemKeyCount || 0;
      const elapsedTimeMs = problem.problemElapsedMs || 0;

      if (keyCount <= 0 || elapsedTimeMs <= 0) return 0;

      // KPM = キー数 / 時間(分)
      return keyCount / (elapsedTimeMs / 60000);
    });

    // KPMの平均値を計算
    const totalKpm = kpmValues.reduce((sum, kpm) => sum + kpm, 0);
    const averageKpm = Math.floor(kpmValues.length > 0 ? totalKpm / kpmValues.length : 0);

    // ランクの計算
    let rank = 'F';
    if (averageKpm >= 400) rank = 'S';
    else if (averageKpm >= 300) rank = 'A';
    else if (averageKpm >= 200) rank = 'B';
    else if (averageKpm >= 150) rank = 'C';
    else if (averageKpm >= 100) rank = 'D';
    else if (averageKpm >= 50) rank = 'E';

    // 合理的な最大値でKPMをキャップ（600が現実的な上限）
    const normalizedKpm = Math.min(averageKpm, 600);

    return {
      kpm: normalizedKpm,
      rank,
      rawKpm: averageKpm,
      sampleCount: validProblems.length,
      timeStamp: new Date().toISOString(),
      isWorker: false
    };
  },

  /**
   * 精度計算（フォールバック）
   * @param {Object} stats 統計情報
   * @returns {number} 精度（0-100）
   */
  calculateAccuracy(stats) {
    if (!stats || !stats.correctKeyCount || !stats.totalKeyCount) {
      return 0;
    }

    const accuracy = (stats.correctKeyCount / stats.totalKeyCount) * 100;
    return Math.min(Math.max(0, Math.round(accuracy * 10) / 10), 100); // 小数点第1位まで
  }
};

// Worker作成
let scoreCalculationWorker;

// 初期化済みかどうかのフラグ
let isInitialized = false;

// 外部から呼び出し可能なAPI
export default {
  /**
   * 初期化
   */  initialize() {
    if (isInitialized) return;
    
    try {
      // Worker作成
      scoreCalculationWorker = createInlineWorker(
        scoreCalcFunction,
        fallbackImpl
      );
      
      isInitialized = true;
      
      // Worker動作状況を確認してフォールバックを設定
      const isWorkerActive = isWorkerAvailable() && 
                             scoreCalculationWorker && 
                             scoreCalculationWorker.instance && 
                             scoreCalculationWorker.instance.active;
                             
      const workerStatus = isWorkerActive ? 'Worker対応（バックグラウンドスレッドで実行）' : 'Worker非対応（メインスレッドでフォールバック）';
      
      console.log('=====================================');
      console.log(`[ScoreCalculationWorker] 初期化完了:`);
      console.log(`実行環境: ${workerStatus}`);
      console.log(`Worker API利用可能性: ${isWorkerAvailable() ? '利用可能' : '利用不可'}`);
      console.log('=====================================');
    } catch (error) {
      console.error('[ScoreCalculationWorker] 初期化エラー:', error);
    }
  },

  /**
   * KPM計算
   * @param {Object} stats 統計情報
   * @returns {Promise<Object>} KPM情報
   */
  async calculateKPM(stats) {
    if (!isInitialized) {
      this.initialize();
    }

    try {
      if (scoreCalculationWorker) {
        return await scoreCalculationWorker.calculateKPM(stats);
      } else {
        return fallbackImpl.calculateKPM(stats);
      }
    } catch (error) {
      console.error('[ScoreCalculationWorker] KPM計算エラー:', error);
      return fallbackImpl.calculateKPM(stats);
    }
  },

  /**
   * 平均KPM計算
   * @param {Array} problemStats 問題統計の配列
   * @returns {Promise<Object>} KPM情報
   */
  async calculateAverageKPM(problemStats) {
    if (!isInitialized) {
      this.initialize();
    }

    try {
      if (scoreCalculationWorker) {
        return await scoreCalculationWorker.calculateAverageKPM(problemStats);
      } else {
        return fallbackImpl.calculateAverageKPM(problemStats);
      }
    } catch (error) {
      console.error('[ScoreCalculationWorker] 平均KPM計算エラー:', error);
      return fallbackImpl.calculateAverageKPM(problemStats);
    }
  },

  /**
   * 精度計算
   * @param {Object} stats 統計情報
   * @returns {Promise<number>} 精度（0-100）
   */
  async calculateAccuracy(stats) {
    if (!isInitialized) {
      this.initialize();
    }

    try {
      if (scoreCalculationWorker) {
        return await scoreCalculationWorker.callMethod('calculateAccuracy', stats);
      } else {
        return fallbackImpl.calculateAccuracy(stats);
      }
    } catch (error) {
      console.error('[ScoreCalculationWorker] 精度計算エラー:', error);
      return fallbackImpl.calculateAccuracy(stats);
    }
  },

  /**
   * クリーンアップ
   */
  cleanup() {
    if (scoreCalculationWorker && scoreCalculationWorker.instance) {
      scoreCalculationWorker.instance.close();
    }
    isInitialized = false;
  }
};
