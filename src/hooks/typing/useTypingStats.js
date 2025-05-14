'use client';

/**
 * useTypingStats.js
 * タイピング統計情報を管理するカスタムフック
 * 責任: タイピングの統計情報の収集と計算
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import TypingUtils from '@/utils/TypingUtils';
import ScoreCalculationWorker from '@/utils/ScoreCalculationWorker';
import { isWorkerAvailable } from '@/utils/WorkerUtils';
import { processTypingInputOnMainThread } from '@/utils/TypingProcessorMain';

/**
 * タイピング統計情報の管理
 * @param {Object} options 設定オプション
 * @returns {Object} 統計情報の状態とメソッド
 */
export function useTypingStats(options = {}) {
  const {
    onStatsUpdate = () => { },
    updateInterval = 250, // 統計情報の更新間隔（ミリ秒）
  } = options;

  // 統計情報は参照で管理（再レンダリング防止）
  const statsRef = useRef({
    correctKeyCount: 0,
    mistakeCount: 0,
    startTime: null,
    currentProblemStartTime: null,
    problemStats: [],
  });

  // UIのみに必要な統計情報
  const [displayStats, setDisplayStats] = useState({
    correctKeyCount: 0,
    mistakeCount: 0,
    kpm: 0,
    rank: 'F',
  });

  // タイマー参照
  const statsUpdateTimerRef = useRef(null);
  /**
   * 統計情報のリセット
   */
  const resetStats = useCallback((keepHistory = false) => {
    const currentStats = statsRef.current;

    statsRef.current = {
      correctKeyCount: 0,
      mistakeCount: 0,
      startTime: null,
      currentProblemStartTime: null,
      // 前の問題のミス数を記録（問題ごとのミス数計算用）
      previousProblemMistakeCount: keepHistory ? currentStats.mistakeCount || 0 : 0,
      // 履歴を保持するオプション
      problemStats: keepHistory ? currentStats.problemStats || [] : [],
    };

    setDisplayStats({
      correctKeyCount: 0,
      mistakeCount: 0,
      kpm: 0,
      rank: 'F',
    });
  }, []);

  /**
   * 正解入力をカウント
   */
  const countCorrectKey = useCallback((timestamp = Date.now()) => {
    const stats = statsRef.current;

    // 初回入力時のみ開始時間を記録
    if (!stats.startTime) {
      stats.startTime = timestamp;
      stats.currentProblemStartTime = timestamp;
    }

    // 正解カウントを更新
    stats.correctKeyCount += 1;

    // スケジュールされた更新がなければ、新しく設定
    if (!statsUpdateTimerRef.current) {
      statsUpdateTimerRef.current = setTimeout(() => {
        updateDisplayStats();
        statsUpdateTimerRef.current = null;
      }, updateInterval);
    }
  }, []);
  /**
   * 不正解入力をカウント
   */
  const countMistake = useCallback(() => {
    statsRef.current.mistakeCount += 1;
    console.log('[useTypingStats] ミス数カウント更新:', statsRef.current.mistakeCount);

    // 即時に表示用の統計も更新する
    setDisplayStats(prev => ({
      ...prev,
      mistakeCount: statsRef.current.mistakeCount
    }));
  }, []);  /**
   * 表示用統計情報を更新（Workerベース）
   */
  const updateDisplayStats = useCallback(async () => {
    // Worker初期化確認
    if (!statsRef.current.workerInitialized) {
      // Worker初期化
      ScoreCalculationWorker.initialize();
      statsRef.current.workerInitialized = true;
    }

    const stats = statsRef.current;
    const correctCount = stats.correctKeyCount;
    const missCount = stats.mistakeCount;
    const totalCount = correctCount + missCount;

    // 統計データ準備
    const startTime = stats.startTime || Date.now();
    const elapsedTimeMs = Date.now() - startTime;

    // Worker用データ構築
    const statsData = {
      keyCount: correctCount,
      elapsedTimeMs,
      correctKeyCount: correctCount,
      totalKeyCount: totalCount,
      mistakeCount: missCount
    };

    // Workerでの計算を実行
    let scoreResult;
    let isUsingWorker = false;
    try {
      // バックグラウンドでKPM計算
      scoreResult = await ScoreCalculationWorker.calculateKPM(statsData);
      isUsingWorker = isWorkerAvailable(); // 実際にWorkerが使用可能か確認
    } catch (error) {
      console.error('[useTypingStats] KPM計算でエラー発生:', error);
      // フォールバック
      const elapsedMinutes = elapsedTimeMs / 60000;
      const kpm = (elapsedMinutes > 0) ? Math.max(1, Math.floor(correctCount / elapsedMinutes)) : 0;
      const rank = TypingUtils.getRank(kpm);
      scoreResult = { kpm, rank };
    }    // 詳細ログ出力は開発完了のため削除

    // 表示用統計情報の更新
    const newDisplayStats = {
      correctKeyCount: correctCount,
      mistakeCount: missCount,
      kpm: scoreResult.kpm,
      rank: scoreResult.rank,
      accuracy: scoreResult.accuracy
    };

    setDisplayStats(newDisplayStats);

    // コールバック呼び出し
    onStatsUpdate(newDisplayStats);

    return newDisplayStats;
  }, [onStatsUpdate]);  /**
   * 問題完了時の統計処理
   */
  const recordProblemCompletion = useCallback(async (options = {}) => {
    const { timestamp = Date.now() } = options;

    const stats = statsRef.current;

    // 問題ごとの統計情報を計算
    const problemElapsedMs = stats.currentProblemStartTime
      ? timestamp - stats.currentProblemStartTime
      : 0;
    const problemKeyCount = stats.correctKeyCount || 0;
    const problemMistakeCount = stats.mistakeCount || 0;    // 問題完了時のミス数ログは削除// Worker初期化確認
    if (!stats.workerInitialized) {
      ScoreCalculationWorker.initialize();
      stats.workerInitialized = true;
    }

    // 問題の詳細データを作成
    const statsData = {
      keyCount: problemKeyCount,
      elapsedTimeMs: problemElapsedMs,
      mistakeCount: problemMistakeCount,
      correctKeyCount: problemKeyCount,
      totalKeyCount: problemKeyCount + problemMistakeCount
    };

    // Workerでスコア計算
    let kpmResult = 0;
    try {
      // バックグラウンドでKPM計算
      const scoreResult = await ScoreCalculationWorker.calculateKPM(statsData);
      kpmResult = scoreResult.kpm;
    } catch (error) {
      console.error('[useTypingStats] 問題KPM計算エラー:', error);
      // フォールバック計算
      kpmResult = problemElapsedMs > 0
        ? Math.floor((problemKeyCount / (problemElapsedMs / 60000)))
        : 0;
    }

    // 問題データの作成
    const problemData = {
      problemKeyCount,
      problemElapsedMs,
      problemMistakeCount,
      problemKPM: kpmResult,
      timestamp,
    };

    // 統計情報を更新
    const updatedProblemStats = [...(stats.problemStats || []), problemData];
    stats.problemStats = updatedProblemStats;

    // 平均KPMの計算（Worker使用）
    let averageKPM = 0;
    let rank = 'F';

    try {
      // バックグラウンドで平均KPM計算
      const averageResult = await ScoreCalculationWorker.calculateAverageKPM(updatedProblemStats);
      averageKPM = averageResult.kpm;
      rank = averageResult.rank;

      // ログ出力（Workerからの結果）
      console.log('[useTypingStats] Worker平均KPM計算結果:', averageResult);
    } catch (error) {
      console.error('[useTypingStats] 平均KPM計算エラー:', error);
      // フォールバック - TypingUtilsを使用
      averageKPM = TypingUtils.calculateAverageKPM(updatedProblemStats);
      rank = TypingUtils.getRank(averageKPM);
    }

    // 表示用統計情報を更新
    updateDisplayStats();    // 問題完了のログ出力を削除

    // 拡張した統計情報を返す
    return {
      // 問題情報
      problemKeyCount: problemData.problemKeyCount,
      problemElapsedMs: problemData.problemElapsedMs,
      problemKPM: problemData.problemKPM,
      problemMistakeCount: problemData.problemMistakeCount,

      // 累計情報
      correctKeyCount: stats.correctKeyCount,
      mistakeCount: stats.mistakeCount,

      // Worker計算結果
      averageKPM,
      rank
    };
  }, [updateDisplayStats]);  /**
   * スキップされた文字を記録
   */
  const recordSkip = useCallback((count = 1) => {
    // スキップ統計情報を更新（必要に応じて）
    console.log(`[useTypingStats] ${count}文字スキップしました`);
    // 現時点ではスキップの統計を特に記録しない
  }, []);  /**
   * クリーンアップ処理
   */
  useEffect(() => {
    // 初期化処理
    ScoreCalculationWorker.initialize();
    statsRef.current.workerInitialized = true;

    // 実装状態の確認とログ出力
    console.log('=====================================');
    console.log('【実装確認】タイピングゲーム実行環境:');
    console.log(`タイピング処理: メインスレッド (${typeof processTypingInputOnMainThread === 'function' ? '有効' : '未定義'})`);
    console.log(`スコア計算: ${isWorkerAvailable() ? 'WebWorker (バックグラウンドスレッド)' : 'メインスレッド (フォールバック)'}`);
    console.log(`WebWorker利用可能性: ${isWorkerAvailable() ? '利用可能' : '利用不可'}`);
    console.log('=====================================');
    return () => {
      if (statsUpdateTimerRef.current) {
        clearTimeout(statsUpdateTimerRef.current);
        statsUpdateTimerRef.current = null;
      }

      // ScoreCalculationWorkerのクリーンアップ
      if (statsRef.current.workerInitialized) {
        console.log('[useTypingStats] ScoreCalculationWorkerをクリーンアップします');
        try {
          ScoreCalculationWorker.cleanup();
          statsRef.current.workerInitialized = false;
        } catch (error) {
          console.error('[useTypingStats] ScoreCalculationWorkerクリーンアップエラー:', error);
        }
      }
    };
  }, []);  return {
    // 状態
    statsRef,
    displayStats,

    // メソッド
    resetStats,
    countCorrectKey,
    countMistake,
    updateDisplayStats,
    recordProblemCompletion,

    /**
     * タイピングミスを記録 (互換性用メソッド - countMistakeを呼び出す)
     */
    recordMistake: useCallback(() => {
      return countMistake();
    }, [countMistake]),

    /**
     * 最新の統計情報を取得
     */    getLatestStats: useCallback(() => {
      return {
        ...displayStats,
        correctKeyCount: statsRef.current.correctKeyCount,
        mistakeCount: statsRef.current.mistakeCount
      };
    }, [displayStats]),

    /**
     * スキップされた文字を記録
     */
    recordSkip: useCallback((count = 1) => {
      // スキップ統計情報を更新（必要に応じて）
      console.log(`[useTypingStats] ${count}文字スキップしました`);
      // 現時点ではスキップの統計を特に記録しない
    }, []),

    /**
     * 正解入力記録（互換性用メソッド - countCorrectKeyを呼び出す）
     */
    recordCorrectKey: useCallback((timestamp = Date.now()) => {
      return countCorrectKey(timestamp);
    }, [countCorrectKey]),
  };
}
