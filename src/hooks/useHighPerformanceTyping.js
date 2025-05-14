'use client';

/**
 * useHighPerformanceTyping.js
 * 高速キー入力に最適化されたタイピングフック
 *
 * 特徴:
 * 1. useRefを活用した状態更新の最小化
 * 2. キー入力のバッファリング処理
 * 3. requestAnimationFrameによる表示更新の最適化
 * 4. React.memoによる不要な再レンダリング防止
 *
 * 2025年5月15日作成
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import TypingUtils from '@/utils/TypingUtils';

// デフォルトサウンドシステム
const DEFAULT_SOUND_SYSTEM = {
  playSound: () => {}, // 無効なデフォルト実装
};

/**
 * 高速キー入力に最適化されたタイピングフック
 * @param {Object} options 設定オプション
 * @returns {Object} タイピング処理と状態
 */
export function useHighPerformanceTyping(options = {}) {
  const {
    initialProblem = null,
    playSound = true,
    soundSystem = DEFAULT_SOUND_SYSTEM,
    onProblemComplete = () => {},
    onDebugInfoUpdate = null,
  } = options;

  // デバッグモード設定
  const DEBUG_MODE = process.env.NODE_ENV === 'development' && false;

  // タイピングセッション - useRefで管理して再レンダリングを防止
  const sessionRef = useRef(null);
  const completedRef = useRef(false);

  // UI状態 - 必要な時だけ更新される状態
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorAnimation, setErrorAnimation] = useState(false);

  // キー入力バッファ - 高速連続キー入力を処理するためのバッファ
  const keyBufferRef = useRef([]);
  const processingRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const animFrameRef = useRef(null);

  // 表示情報の内部参照 - 高頻度更新用
  const displayInfoRef = useRef({
    romaji: '',
    typedLength: 0,
    currentInputLength: 0,
    currentCharIndex: 0,
    currentInput: '',
    expectedNextChar: '',
    currentCharRomaji: '',
    updated: Date.now(),
  });

  // UI表示用の情報 - requestAnimationFrameでバッチ更新
  const [displayInfo, setDisplayInfo] = useState({
    romaji: '',
    typedLength: 0,
    currentInputLength: 0,
    currentCharIndex: 0,
    currentInput: '',
    expectedNextChar: '',
    currentCharRomaji: '',
  });

  // 進捗情報
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);

  // 統計情報 - 内部処理用
  const statsRef = useRef({
    correctKeyCount: 0,
    mistakeCount: 0,
    startTime: null,
    kpm: 0,
  });

  // 表示用統計情報
  const [stats, setStats] = useState({
    correctKeyCount: 0,
    mistakeCount: 0,
    kpm: 0,
  });

  // タイマー参照
  const errorTimerRef = useRef(null);
  const updateTimerRef = useRef(null);

  /**
   * エラーアニメーション表示
   */
  const showErrorAnimation = useCallback(() => {
    setErrorAnimation(true);

    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }

    errorTimerRef.current = setTimeout(() => {
      setErrorAnimation(false);
      errorTimerRef.current = null;
    }, 150);
  }, []);

  /**
   * 表示情報と進捗のリフレッシュ
   * requestAnimationFrameを使用して効率的にUIを更新
   */
  const refreshDisplayInfo = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    animFrameRef.current = requestAnimationFrame(() => {
      const now = performance.now();

      // 前回の更新から最小間隔（16ms = 約60fps）を空ける
      if (now - lastFrameTimeRef.current >= 16) {
        lastFrameTimeRef.current = now;

        // 表示情報の更新
        setDisplayInfo((current) => {
          const newInfo = { ...displayInfoRef.current };

          // 変更がないなら更新しない（参照同一性を維持）
          if (JSON.stringify(current) === JSON.stringify(newInfo)) {
            return current;
          }

          return newInfo;
        });

        // 進捗情報の更新（5%以上変化した場合のみ）
        const currentProgress = progressRef.current;
        if (Math.abs(currentProgress - progress) >= 5) {
          setProgress(currentProgress);
        }

        // 統計情報の更新（1秒に1回程度）
        setStats((current) => {
          const newStats = { ...statsRef.current };

          // 変更がないなら更新しない
          if (JSON.stringify(current) === JSON.stringify(newStats)) {
            return current;
          }

          return newStats;
        });
      }

      animFrameRef.current = null;
    });
  }, [progress]);

  /**
   * 定期的な表示更新を開始
   */
  const startPeriodicRefresh = useCallback(() => {
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
    }

    // 60fpsで更新（約16ms間隔）
    updateTimerRef.current = setInterval(() => {
      refreshDisplayInfo();
    }, 50); // 少し余裕を持たせる（50ms間隔 = 20fps）
  }, [refreshDisplayInfo]);

  /**
   * タイピングセッション初期化
   */
  const initializeSession = useCallback((problem) => {
    if (!problem) return false;

    try {
      // 既存セッションのクリーンアップ
      if (sessionRef.current) {
        // 必要に応じてクリーンアップ処理
      }

      // 新しいセッション作成
      const session = TypingUtils.createTypingSession(problem);
      if (!session) return false;

      // セッション保存
      sessionRef.current = session;
      completedRef.current = false;

      // 表示情報初期化
      const colorInfo = session.getColoringInfo();

      displayInfoRef.current = {
        romaji: colorInfo?.romaji || '',
        typedLength: 0,
        currentInputLength: colorInfo?.currentInputLength || 0,
        currentCharIndex: colorInfo?.currentCharIndex || 0,
        currentInput: colorInfo?.currentInput || '',
        expectedNextChar: colorInfo?.expectedNextChar || '',
        currentCharRomaji: colorInfo?.currentCharRomaji || '',
        updated: Date.now(),
      };

      // 進捗リセット
      progressRef.current = 0;

      // 統計情報リセット
      statsRef.current = {
        correctKeyCount: 0,
        mistakeCount: 0,
        startTime: Date.now(),
        kpm: 0,
      };

      // UI状態を更新
      setIsInitialized(true);
      setIsCompleted(false);

      // 表示情報を初期更新（即時）
      setDisplayInfo({ ...displayInfoRef.current });
      setProgress(0);
      setStats({ ...statsRef.current });

      return true;
    } catch (error) {
      console.error(
        '[useHighPerformanceTyping] セッション初期化エラー:',
        error
      );
      return false;
    }
  }, []);

  /**
   * 問題完了処理
   */
  const markAsCompleted = useCallback(() => {
    if (completedRef.current) return;

    completedRef.current = true;
    setIsCompleted(true);

    // 統計情報の最終更新
    const elapsedMs = Date.now() - statsRef.current.startTime;
    const correctCount = statsRef.current.correctKeyCount;

    // KPM計算 (Keys Per Minute)
    const kpm = Math.round((correctCount / elapsedMs) * 60000);
    statsRef.current.kpm = kpm;

    // 完了コールバック呼び出し
    onProblemComplete({
      problemKeyCount: correctCount,
      problemElapsedMs: elapsedMs,
      problemKPM: kpm,
    });

    // 最終的なUI更新
    refreshDisplayInfo();
  }, [onProblemComplete, refreshDisplayInfo]);

  /**
   * キー入力処理関数 - useRefを活用して状態更新を最小化
   */
  const processKey = useCallback(
    (key) => {
      if (!sessionRef.current || completedRef.current) {
        return { success: false };
      }

      try {
        // 入力処理
        let result;

        if (typeof sessionRef.current.accept === 'function') {
          // TypingManiaスタイルのacceptメソッド
          const acceptResult = sessionRef.current.accept(key);

          if (acceptResult === 1) {
            // 正解
            result = { success: true, status: 'input_accepted' };

            // 完了チェック
            if (sessionRef.current.isCompleted?.()) {
              result.status = 'all_completed';
            }
          } else if (acceptResult === -1) {
            // 不正解
            result = { success: false, status: 'wrong_input' };
          } else {
            // 無効
            result = { success: false, status: 'invalid_input' };
          }
        } else if (typeof sessionRef.current.processInput === 'function') {
          // 従来のprocessInputメソッド
          result = sessionRef.current.processInput(key);
        } else {
          return { success: false, reason: 'invalid_session' };
        }

        if (result.success) {
          // 正解時の処理

          // 統計情報更新
          statsRef.current.correctKeyCount++;

          // KPM計算更新
          const elapsedMs = Date.now() - statsRef.current.startTime;
          statsRef.current.kpm = Math.round(
            (statsRef.current.correctKeyCount / elapsedMs) * 60000
          );

          // 効果音再生
          if (playSound && soundSystem) {
            if (typeof soundSystem.ultraFastPlayTypingSound === 'function') {
              soundSystem.ultraFastPlayTypingSound('success');
            } else if (typeof soundSystem.playSound === 'function') {
              soundSystem.playSound('success');
            }
          }

          // 表示情報更新
          const colorInfo = sessionRef.current.getColoringInfo?.() || {};
          displayInfoRef.current = {
            romaji: colorInfo.romaji || '',
            typedLength: colorInfo.typedLength || 0,
            currentInputLength: colorInfo.currentInputLength || 0,
            currentCharIndex: colorInfo.currentCharIndex || 0,
            currentInput: colorInfo.currentInput || '',
            expectedNextChar: colorInfo.expectedNextChar || '',
            currentCharRomaji: colorInfo.currentCharRomaji || '',
            updated: Date.now(),
          };

          // 進捗更新
          progressRef.current =
            sessionRef.current.getCompletionPercentage?.() || 0;

          // 完了確認
          const isCompleted =
            result.status === 'all_completed' ||
            sessionRef.current.isCompleted?.() === true;
          if (isCompleted) {
            markAsCompleted();
          }

          return { success: true };
        } else {
          // 不正解時の処理

          // 統計情報更新
          statsRef.current.mistakeCount++;

          // 効果音再生
          if (playSound && soundSystem) {
            if (typeof soundSystem.ultraFastPlayTypingSound === 'function') {
              soundSystem.ultraFastPlayTypingSound('error');
            } else if (typeof soundSystem.playSound === 'function') {
              soundSystem.playSound('error');
            }
          }

          // エラーアニメーション表示
          showErrorAnimation();

          return { success: false, reason: 'incorrect_input' };
        }
      } catch (error) {
        console.error('[useHighPerformanceTyping] キー処理エラー:', error);
        return { success: false, reason: 'processing_error' };
      }
    },
    [
      sessionRef,
      completedRef,
      playSound,
      soundSystem,
      showErrorAnimation,
      markAsCompleted,
    ]
  );

  /**
   * キー入力バッファ処理
   * 連続キー入力時のパフォーマンス向上のためバッファリングを行う
   */
  const processKeyBuffer = useCallback(() => {
    if (processingRef.current || keyBufferRef.current.length === 0) return;

    processingRef.current = true;

    try {
      // バッファから1つずつキーを処理
      const key = keyBufferRef.current.shift();
      if (key) {
        processKey(key);
      }
    } finally {
      processingRef.current = false;

      // バッファ内にまだキーがあれば再度処理
      if (keyBufferRef.current.length > 0) {
        // 非同期で次のキーを処理（UIレンダリングをブロックしない）
        setTimeout(() => processKeyBuffer(), 0);
      }

      // 表示情報の更新をスケジュール
      refreshDisplayInfo();
    }
  }, [processKey, refreshDisplayInfo]);

  /**
   * キー入力ハンドラ関数
   * キーバッファに追加してから処理をスケジュール
   */
  const handleInput = useCallback(
    (key) => {
      // 特殊キーやコントロールキーは無視
      if (!key || typeof key !== 'string' || key.length === 0) {
        return;
      }

      // 完了状態確認
      if (completedRef.current || isCompleted) {
        return;
      }

      // キーをバッファに追加
      keyBufferRef.current.push(key);

      // 処理を開始
      processKeyBuffer();
    },
    [isCompleted, processKeyBuffer]
  );

  /**
   * キーボードイベントリスナー設定
   */
  const setupKeyboardListener = useCallback(() => {
    const handleKeyDown = (event) => {
      // 特殊キーは無視
      if (
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.key === 'Control' ||
        event.key === 'Alt' ||
        event.key === 'Meta' ||
        event.key === 'CapsLock' ||
        event.key === 'Shift' ||
        event.key === 'Tab' ||
        event.key === 'Escape'
      ) {
        return;
      }

      // キー入力処理
      handleInput(event.key);
    };

    // イベントリスナー登録
    window.addEventListener('keydown', handleKeyDown);

    // クリーンアップ関数を返す
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleInput]);

  /**
   * 初期問題の設定
   */
  useEffect(() => {
    if (initialProblem) {
      initializeSession(initialProblem);
    }
  }, [initialProblem, initializeSession]);

  /**
   * 定期的な更新処理開始
   */
  useEffect(() => {
    startPeriodicRefresh();

    // キーボードリスナー設定
    const cleanupKeyboard = setupKeyboardListener();

    // クリーンアップ関数
    return () => {
      cleanupKeyboard();

      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
        updateTimerRef.current = null;
      }

      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [startPeriodicRefresh, setupKeyboardListener]);

  // デバッグ情報の更新
  useEffect(() => {
    if (onDebugInfoUpdate) {
      const debugInfo = {
        bufferLength: keyBufferRef.current.length,
        sessionActive: !!sessionRef.current,
        correctKeyCount: statsRef.current.correctKeyCount,
        mistakeCount: statsRef.current.mistakeCount,
        kpm: statsRef.current.kpm,
        progress: progressRef.current,
        isCompleted: completedRef.current,
      };

      onDebugInfoUpdate(debugInfo);
    }
  }, [onDebugInfoUpdate, displayInfo, progress, stats]);

  // メモ化されたAPIを返す
  return useMemo(
    () => ({
      // 状態
      isInitialized,
      isCompleted,
      errorAnimation,
      displayInfo,
      progress,
      stats,

      // 参照
      sessionRef,
      completedRef,

      // メソッド
      handleInput,
      initializeSession,
      markAsCompleted,
    }),
    [
      isInitialized,
      isCompleted,
      errorAnimation,
      displayInfo,
      progress,
      stats,
      handleInput,
      initializeSession,
      markAsCompleted,
    ]
  );
}
