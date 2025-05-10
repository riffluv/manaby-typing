'use client';

/**
 * useTypingStats.js
 * タイピング統計情報を管理するカスタムフック
 * 責任: タイピングの統計情報の収集と計算
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import TypingUtils from '@/utils/TypingUtils';

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
  }, []);
  /**
   * 表示用統計情報を更新
   */
  const updateDisplayStats = useCallback(() => {
    const stats = statsRef.current;
    const correctCount = stats.correctKeyCount;
    const missCount = stats.mistakeCount;

    // シンプルなKPM計算 = キー数 ÷ 経過時間(分)
    // 経過時間を計算
    let kpm = 0;
    const startTime = stats.startTime || Date.now();
    const elapsedTimeMs = Date.now() - startTime;
    const elapsedMinutes = elapsedTimeMs / 60000; // ミリ秒から分に変換

    // KPM計算 - 単純にキー数 ÷ 経過時間(分)
    if (elapsedMinutes > 0) {
      kpm = Math.floor(correctCount / elapsedMinutes);
    }

    // ログ出力
    console.log('[useTypingStats] KPM計算:', {
      correctCount,
      elapsedTimeMs,
      elapsedMinutes,
      kpm
    });

    // 最低値の保証
    if (kpm <= 0 && correctCount > 0) {
      kpm = 1;
    }

    const rank = TypingUtils.getRank(kpm);

    // 表示用統計情報の更新
    const newDisplayStats = {
      correctKeyCount: correctCount,
      mistakeCount: missCount,
      kpm,
      rank,
    };

    setDisplayStats(newDisplayStats);

    // コールバック呼び出し
    onStatsUpdate(newDisplayStats);

    return newDisplayStats;
  }, [onStatsUpdate]);
  /**
   * 問題完了時の統計処理
   */
  const recordProblemCompletion = useCallback((options = {}) => {
    const { timestamp = Date.now() } = options;

    const stats = statsRef.current;

    // 問題ごとの統計情報を計算
    const problemElapsedMs = stats.currentProblemStartTime
      ? timestamp - stats.currentProblemStartTime
      : 0;
    const problemKeyCount = stats.correctKeyCount || 0;
    const problemMistakeCount = stats.mistakeCount || 0;

    // 現在のミス数を詳細にログ出力
    console.log('[useTypingStats] 問題完了時のミス数:', {
      mistakeCount: stats.mistakeCount,
      currentProblemStartTime: stats.currentProblemStartTime,
      elapsedMs: problemElapsedMs
    });

    // 問題の詳細データを作成 - シンプルな計算
    const problemData = {
      problemKeyCount,
      problemElapsedMs,
      problemMistakeCount,
      problemKPM: problemElapsedMs > 0
        ? Math.floor((problemKeyCount / (problemElapsedMs / 60000)))
        : 0,
      timestamp,
    };

    // 統計情報を更新
    const updatedProblemStats = [...(stats.problemStats || []), problemData];
    stats.problemStats = updatedProblemStats;    // 表示用統計情報を更新
    updateDisplayStats();      // シンプルな統計情報を返す
    console.log('[useTypingStats] 問題完了 - 統計情報:', {
      正解キー数: problemData.problemKeyCount,
      ミス数: problemData.problemMistakeCount,
      経過時間: problemData.problemElapsedMs,
      KPM: problemData.problemKPM
    });

    // 拡張した統計情報を返す
    return {
      // 問題情報
      problemKeyCount: problemData.problemKeyCount,
      problemElapsedMs: problemData.problemElapsedMs,
      problemKPM: problemData.problemKPM,
      problemMistakeCount: problemData.problemMistakeCount,

      // 累計情報
      correctKeyCount: stats.correctKeyCount,
      mistakeCount: stats.mistakeCount
    };
  }, [updateDisplayStats]);

  /**
   * クリーンアップ処理
   */
  useEffect(() => {
    return () => {
      if (statsUpdateTimerRef.current) {
        clearTimeout(statsUpdateTimerRef.current);
        statsUpdateTimerRef.current = null;
      }
    };
  }, []);

  return {
    // 状態
    statsRef,
    displayStats,

    // メソッド
    resetStats,
    countCorrectKey,
    countMistake,
    updateDisplayStats,
    recordProblemCompletion,
  };
}
