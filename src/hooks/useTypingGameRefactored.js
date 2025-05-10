'use client';

/**
 * useTypingGameRefactored.js
 * タイピングゲームの統合カスタムフック
 * リファクタリング版 - モジュール分割と責任の明確化
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTypingCore } from './typing/useTypingCore';
import { useTypingInput } from './typing/useTypingInput';
import { useTypingStats } from './typing/useTypingStats';
import TypingUtils from '@/utils/TypingUtils';

const DEFAULT_SOUND_SYSTEM = {
  playSound: () => { }, // 無効なデフォルト実装
};

/**
 * タイピングゲームの統合カスタムフック
 * 3つの専門フックを組み合わせて、完全なタイピングゲーム体験を提供
 * 
 * @param {Object} options タイピングゲームの設定オプション
 * @param {Object} options.initialProblem 初期問題
 * @param {boolean} options.playSound 効果音を再生するかどうか
 * @param {Object} options.soundSystem サウンドシステム
 * @param {Function} options.onProblemComplete 問題完了時のコールバック
 * @param {Function} options.onDebugInfoUpdate デバッグ情報更新のコールバック
 * @returns {Object} タイピングゲームの状態と操作メソッド
 */
export function useTypingGameRefactored(options = {}) {
  const {
    initialProblem = null,
    playSound = true,
    soundSystem = DEFAULT_SOUND_SYSTEM,
    onProblemComplete = () => { },
    onDebugInfoUpdate = null,
  } = options;

  // デバッグ情報
  const debugInfoRef = useRef({});

  // 進捗更新の最小閾値（パーセント）
  const PROGRESS_UPDATE_THRESHOLD = 5;

  /**
   * 問題状態変更時の処理
   */
  const handleProblemStateChange = useCallback(({ type, progress }) => {
    if (type === 'completed') {
      const statsData = typingStats.recordProblemCompletion();

      // コールバック呼び出し
      onProblemComplete({
        problemKeyCount: statsData.problem.problemKeyCount,
        problemElapsedMs: statsData.problem.problemElapsedMs,
        problemKPM: statsData.problem.problemKPM,
        updatedProblemKPMs: statsData.allProblems.map(p => p.problemKPM || 0),
        problemStats: statsData.allProblems
      });
    }
  }, [onProblemComplete]);

  /**
   * コアタイピング機能
   */
  const typingCore = useTypingCore({
    initialProblem,
    onProblemStateChange: handleProblemStateChange,
    onSessionInitialized: (session) => {
      // セッション初期化時の追加処理
      typingStats.resetStats();
    },
  });

  /**
   * 統計情報管理
   */
  const typingStats = useTypingStats({
    onStatsUpdate: (stats) => {
      // デバッグ情報の更新
      if (onDebugInfoUpdate) {
        const debugInfo = {
          ...debugInfoRef.current,
          stats,
        };
        debugInfoRef.current = debugInfo;
        onDebugInfoUpdate(debugInfo);
      }
    }
  });

  /**
   * 入力処理
   */
  const typingInput = useTypingInput({
    sessionRef: typingCore.sessionRef,
    isCompleted: typingCore.isCompleted,
    completedRef: typingCore.completedRef,
    playSound,
    soundSystem,
    onCorrectInput: ({ key, displayInfo, progress }) => {
      // 表示情報の更新
      typingCore.setDisplayInfo(displayInfo);

      // 大きな進捗変化があるときのみ更新
      if (Math.abs(progress - typingCore.progressPercentage) >= PROGRESS_UPDATE_THRESHOLD) {
        typingCore.setProgressPercentage(progress);
      }

      // 統計情報を更新
      typingStats.countCorrectKey(Date.now());

      // デバッグ情報の更新
      if (onDebugInfoUpdate) {
        debugInfoRef.current = {
          ...debugInfoRef.current,
          lastKey: key,
          displayInfo,
          progress,
        };
        onDebugInfoUpdate(debugInfoRef.current);
      }
    },
    onIncorrectInput: ({ key }) => {
      // 統計情報を更新
      typingStats.countMistake();

      // デバッグ情報の更新
      if (onDebugInfoUpdate) {
        debugInfoRef.current = {
          ...debugInfoRef.current,
          lastErrorKey: key,
        };
        onDebugInfoUpdate(debugInfoRef.current);
      }
    },
    onComplete: () => {
      typingCore.markAsCompleted();
    },
  });
  /**
   * 問題設定メソッド
   */
  const setProblem = useCallback((problem) => {
    console.log('[useTypingGameRefactored] 問題を設定します:', {
      displayText: problem?.displayText?.substring(0, 20) + '...',
      kanaText: problem?.kanaText?.substring(0, 20) + '...'
    });
    return typingCore.initializeSession(problem);
  }, [typingCore]);

  /**
   * 次の入力キーを取得
   */
  const getNextKey = useCallback(() => {
    return typingCore.getExpectedNextKey();
  }, [typingCore]);
  /**
   * 公開API
   */
  return {
    // 状態
    isInitialized: typingCore.isInitialized,
    isCompleted: typingCore.isCompleted,
    displayInfo: typingCore.displayInfo || {
      romaji: '',
      typedLength: 0,
      currentInputLength: 0,
      currentCharIndex: 0,
    },
    displayStats: typingStats.displayStats || {},
    progressPercentage: typingCore.progressPercentage || 0,
    errorAnimation: typingInput.errorAnimation || false,
    lastPressedKey: typingInput.lastPressedKey || '',

    // タイピングセッション参照（直接アクセス用）
    typingSession: typingCore.sessionRef.current,
    typingSessionRef: typingCore.sessionRef,

    // メソッド
    handleInput: typingInput.handleInput,
    setProblem,
    getNextKey,

    // 統計メソッド
    resetStats: typingStats.resetStats,
    updateDisplayStats: typingStats.updateDisplayStats,

    // パフォーマンスメトリクス
    performanceMetrics: {
      get inputLatency() {
        return debugInfoRef.current.inputLatency;
      },
      set inputLatency(value) {
        debugInfoRef.current.inputLatency = value;
        if (onDebugInfoUpdate) {
          onDebugInfoUpdate(debugInfoRef.current);
        }
      }
    }
  };
}
