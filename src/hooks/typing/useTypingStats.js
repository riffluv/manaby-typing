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
  }, []);

  /**
   * 表示用統計情報を更新
   */
  const updateDisplayStats = useCallback(() => {
    const stats = statsRef.current;
    const correctCount = stats.correctKeyCount;
    const missCount = stats.mistakeCount;

    // 問題データがある場合は平均KPMを計算
    let kpm = 0;
    if (stats.problemStats && stats.problemStats.length > 0) {
      // 各問題のKPMの平均値を使用
      kpm = TypingUtils.calculateAverageKPM(stats.problemStats);
    } else {
      // 問題データがない場合は単純計算
      const startTime = stats.startTime || Date.now();
      const elapsedTimeMs = Date.now() - startTime;

      // ゼロ除算を防ぐ
      if (elapsedTimeMs > 0) {
        kpm = Math.floor(correctCount / (elapsedTimeMs / 60000));
      }
    }

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

    // 問題の詳細データを作成
    const problemData = {
      problemKeyCount,
      problemElapsedMs,
      problemKPM: problemElapsedMs > 0
        ? Math.floor((problemKeyCount / (problemElapsedMs / 60000)))
        : 0,
      timestamp,
    };

    // 統計情報を更新
    const updatedProblemStats = [...(stats.problemStats || []), problemData];
    stats.problemStats = updatedProblemStats;

    // 表示用統計情報を更新
    updateDisplayStats();

    return {
      problem: problemData,
      allProblems: updatedProblemStats,
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
