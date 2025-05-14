'use client';

/**
 * useTypingGame.js
 * タイピングゲームの統合カスタムフック
 * 最適化版 - モジュール分割と責任の明確化
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
export function useTypingGame(options = {}) {
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
        problemKeyCount: statsData.problemKeyCount,
        problemElapsedMs: statsData.problemElapsedMs,
        problemKPM: statsData.problemKPM,
        updatedProblemKPMs: [], // statsDataから正しく取得できない場合はからの配列を設定
        problemStats: [] // statsDataから正しく取得できない場合はからの配列を設定
      });      // デバッグログを削除
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
      // 進捗が十分変化した場合のみ更新（最適化）
      if (Math.abs(progress - typingCore.progressPercentage) > PROGRESS_UPDATE_THRESHOLD) {
        typingCore.setProgressPercentage(progress);
      }

      // 表示情報を更新
      typingCore.setDisplayData(displayInfo);

      // 統計情報を更新
      typingStats.recordCorrectKey();
    },
    onIncorrectInput: () => {
      // ミス入力を記録
      typingStats.recordMistake();
    },    onComplete: ({ result, displayInfo, progress, combo, maxCombo }) => {
      try {
        // 完了フラグを設定（エラーハンドリング強化）
        if (typingCore && typeof typingCore.setCompleted === 'function') {
          console.log('[useTypingGame] 完了フラグを設定します');
          typingCore.setCompleted(true);
          
          // 安全対策として直接参照も更新
          if (typingCore.completedRef) {
            typingCore.completedRef.current = true;
          }
        } else {
          console.warn('[useTypingGame] typingCore.setCompletedが未定義です');
        }

        // 最終進捗を100%に
        if (typingCore && typeof typingCore.setProgressPercentage === 'function') {
          typingCore.setProgressPercentage(100);
        }

        // 最終的な表示情報を設定
        if (typingCore && typeof typingCore.setDisplayData === 'function') {
          typingCore.setDisplayData(displayInfo);
        }
      } catch (error) {
        console.error('[useTypingGame] 完了処理中にエラーが発生しました:', error);
      }

      // 問題完了イベント通知
      handleProblemStateChange({
        type: 'completed',
        progress: 100,
        combo,
        maxCombo
      });
    },
    onLineEnd: ({ leftover, completed, combo, maxCombo }) => {
      // 残りの未入力文字をスキップとして記録
      if (leftover > 0) {
        typingStats.recordSkip(leftover);
      }

      // 完了時は完了イベントを発生
      if (completed) {
        handleProblemStateChange({ 
          type: 'completed', 
          progress: 100,
          combo,
          maxCombo
        });
      }
    }
  });

  /**
   * タイムベースの更新を実行（アクティブに実行)
   * @param {number} currentTime 現在時刻（ミリ秒）
   */
  const updateTimeBased = useCallback((currentTime) => {
    // セッションが有効でタイピング中の場合のみ更新
    if (
      typingCore.sessionRef.current && 
      !typingCore.isCompleted && 
      typingInput.updateSession
    ) {
      typingInput.updateSession(currentTime);
    }
  }, [typingCore.sessionRef, typingCore.isCompleted, typingInput]);

  /**
   * スコア情報を取得
   * @returns {Object} スコア情報
   */  const getScoreInfo = useCallback(() => {
    try {
      // セッションのスコア情報を取得（エラーハンドリング追加）
      const session = typingCore?.sessionRef?.current;
      if (!session) return { combo: 0, maxCombo: 0, score: 0, rank: 'F' };

      // 基本スコア情報
      const baseInfo = {
        combo: session.getCombo?.() || 0,
        maxCombo: session.getMaxCombo?.() || 0,
      };
      
      // 表示統計とスコア情報を合わせて返却
      if (typingStats && typeof typingStats.getLatestStats === 'function') {
        const latestStats = typingStats.getLatestStats() || {};
        return {
          ...baseInfo,
          ...latestStats,
          score: latestStats.kpm ? Math.floor(latestStats.kpm * (baseInfo.maxCombo || 1)) : 0,
          rank: latestStats.rank || 'F'
        };
      } else {
        return { ...baseInfo, score: 0, rank: 'F' };
      }
    } catch (error) {
      console.error('[useTypingGame] スコア情報の取得中にエラーが発生しました:', error);
      return { combo: 0, maxCombo: 0, score: 0, rank: 'F' };
    }
  }, [typingCore?.sessionRef, typingStats]);

  /**
   * アニメーションフレームごとの処理
   * リアルタイムな更新とアニメーション同期
   */
  useEffect(() => {
    if (!typingCore.sessionRef.current) return;

    // 更新用のRAF
    let rafId = null;
    const updateFrame = (timestamp) => {
      // タイピングセッションのタイムベース更新
      updateTimeBased(timestamp);
      
      // 更新を継続
      rafId = requestAnimationFrame(updateFrame);
    };

    // 更新開始
    rafId = requestAnimationFrame(updateFrame);

    // クリーンアップ
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [typingCore.sessionRef, updateTimeBased]);

  // デバッグ情報更新
  useEffect(() => {
    if (!onDebugInfoUpdate) return;

    // 最新の情報を収集
    const debugInfo = {
      session: typingCore.sessionRef.current ? {
        completed: typingCore.isCompleted,
        progress: typingCore.progressPercentage,
        displayData: typingCore.displayData,
      } : null,
      stats: typingStats.getLatestStats(),
      input: {
        lastKey: typingInput.lastPressedKey,
        errorState: typingInput.errorAnimation,
      },
      score: getScoreInfo(),
    };

    debugInfoRef.current = debugInfo;
    onDebugInfoUpdate(debugInfo);
  }, [
    typingCore.isCompleted,
    typingCore.progressPercentage,
    typingCore.displayData,
    typingInput.lastPressedKey,
    typingInput.errorAnimation,
    onDebugInfoUpdate,
    typingStats,
    getScoreInfo
  ]);

  /**
   * 問題設定メソッド
   */
  const setProblem = useCallback((problem) => {
    console.log('[useTypingGame] 問題を設定します:', {
      displayText: problem?.displayText?.substring(0, 20) + '...',
      kanaText: problem?.kanaText?.substring(0, 20) + '...'
    });

    // 前のセッションの統計をリセット
    typingStats.resetStats();

    // 新しい問題でセッションを初期化
    const result = typingCore.initializeSession(problem);

    // 強制的に表示情報を更新（初期化直後に確実に更新）
    if (result && typingCore.sessionRef.current) {
      const colorInfo = typingCore.sessionRef.current.getColoringInfo();
      typingCore.setDisplayInfo({
        romaji: colorInfo.romaji || '',
        typedLength: 0,
        currentInputLength: colorInfo.currentInputLength || 0,
        currentCharIndex: colorInfo.currentCharIndex || 0,
        currentInput: colorInfo.currentInput || '',
        expectedNextChar: colorInfo.expectedNextChar || '',
        currentCharRomaji: colorInfo.currentCharRomaji || '',
      });
    }

    return result;
  }, [typingCore, typingStats]);

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

    // typingStatsオブジェクト全体を公開
    typingStats,

    // 統計参照を直接公開（アクセスしやすいように）
    statsRef: typingStats.statsRef,

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
