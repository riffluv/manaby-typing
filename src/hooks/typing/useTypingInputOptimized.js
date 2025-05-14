'use client';

/**
 * useTypingInputOptimized.js
 * タイピング入力処理に特化した最適化フック
 * 責任: キー入力処理とフィードバック（高速キー入力に特化）
 */

import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * タイピング入力処理（高速入力対応最適化版 2025年5月15日）
 * @param {Object} options 設定オプション
 * @returns {Object} 入力処理の状態とメソッド
 */
export function useTypingInputOptimized(options = {}) {
  // オプションのセーフティチェック
  const {
    sessionRef,
    isCompleted,
    completedRef,
    onCorrectInput = () => {},
    onIncorrectInput = () => {},
    onComplete = () => {},
    onLineEnd = () => {},
    playSound = true,
    soundSystem = null,
    updateInterval = 16, // アニメーションフレームレートに合わせて約60fps
  } = options || {};

  // デバッグモード設定
  const DEBUG_MODE = process.env.NODE_ENV === 'development' && false;

  // デバッグログ関数
  const debugLog = useCallback(
    (message, ...args) => {
      if (DEBUG_MODE)
        console.log(`[useTypingInputOptimized] ${message}`, ...args);
    },
    [DEBUG_MODE]
  );

  // 入力統計情報 - useRefで管理して不要な再レンダリングを防止
  const inputStatsRef = useRef({
    totalKeyPresses: 0,
    correctKeyPresses: 0,
    incorrectKeyPresses: 0,
    lastKeyTime: 0,
    averageLatency: 0,
  });

  // UIに表示するスコア情報 - 必要な時だけ更新
  const [score, setScore] = useState({
    points: 0,
    combo: 0,
    maxCombo: 0,
  });

  // 内部で使用するスコア情報 - useRefで管理して再レンダリングを防止
  const scoreRef = useRef({
    points: 0,
    combo: 0,
    maxCombo: 0,
  });

  // エラーアニメーション状態 - このような視覚的なフィードバックはuseStateで管理
  const [errorAnimation, setErrorAnimation] = useState(false);
  const errorTimerRef = useRef(null);

  // 最後に押されたキー - 必要な場合のみuseStateを使用
  const [lastPressedKey, setLastPressedKey] = useState('');
  const lastPressedKeyRef = useRef(''); // 内部処理用のRef

  // 表示情報の参照 - レンダリングに必要な情報だけをuseStateで管理
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

  // レンダリング用の表示情報 - バッチ更新のためにuseRefの内容を定期的に反映
  const [displayInfoForRendering, setDisplayInfoForRendering] = useState({
    romaji: '',
    typedLength: 0,
    currentInputLength: 0,
    currentCharIndex: 0,
    currentInput: '',
    expectedNextChar: '',
    currentCharRomaji: '',
  });

  // 進捗情報の参照 - 内部処理用
  const progressRef = useRef(0);

  // レンダリング用の進捗情報 - 閾値を超えたときだけ更新
  const [progressForRendering, setProgressForRendering] = useState(0);

  // 更新タイマー
  const updateTimerRef = useRef(null);
  const renderUpdateTimerRef = useRef(null);

  // 前回の進捗更新値（閾値以上の変化があった場合のみ更新）
  const lastProgressUpdateRef = useRef(0);

  // 進捗更新の閾値（%）
  const PROGRESS_UPDATE_THRESHOLD = 2;

  /**
   * バッチ処理用の状態更新スケジューラ
   * 複数の入力を処理した後で一度だけ状態を更新する
   */
  const scheduleRenderUpdate = useCallback(() => {
    if (renderUpdateTimerRef.current) {
      return; // すでにスケジュールされている場合は何もしない
    }

    // requestAnimationFrameを使用して次のフレームで更新
    renderUpdateTimerRef.current = requestAnimationFrame(() => {
      // 表示情報を更新
      setDisplayInfoForRendering((prevInfo) => {
        const newInfo = { ...displayInfoRef.current };

        // 変更がない場合は更新しない（参照の同一性を維持）
        if (JSON.stringify(prevInfo) === JSON.stringify(newInfo)) {
          return prevInfo;
        }
        return newInfo;
      });

      // 進捗情報を更新（閾値を超えた場合のみ）
      const currentProgress = progressRef.current;
      if (
        Math.abs(currentProgress - lastProgressUpdateRef.current) >=
        PROGRESS_UPDATE_THRESHOLD
      ) {
        setProgressForRendering(currentProgress);
        lastProgressUpdateRef.current = currentProgress;
      }

      // スコア情報を更新
      setScore((prevScore) => {
        const newScore = { ...scoreRef.current };

        // 変更がない場合は更新しない
        if (
          prevScore.combo === newScore.combo &&
          prevScore.maxCombo === newScore.maxCombo &&
          prevScore.points === newScore.points
        ) {
          return prevScore;
        }
        return newScore;
      });

      renderUpdateTimerRef.current = null;
    });
  }, []);

  /**
   * エラーアニメーション管理
   */
  const showErrorAnimation = useCallback(() => {
    // エラーアニメーション表示
    setErrorAnimation(true);

    // 既存のタイマーをクリア
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }

    // タイマーを設定してエラーアニメーションを消す
    errorTimerRef.current = setTimeout(() => {
      setErrorAnimation(false);
      errorTimerRef.current = null;
    }, 150); // 高速応答のため短縮
  }, []);

  /**
   * リアルタイム更新処理
   */
  const updateSession = useCallback(() => {
    // セッション存在確認
    const session = sessionRef?.current;
    if (!session || completedRef?.current || isCompleted) {
      return;
    }

    // タイムベースの更新をサポートしているか確認
    if (typeof session.update === 'function') {
      try {
        // 現在時刻を取得して更新処理を実行
        const currentTime = performance.now();
        const [changed, leftover] = session.update(currentTime);

        // 行が変わった場合の処理（時間経過で自動進行した場合）
        if (changed) {
          debugLog('行の更新:', { leftover });

          // 残りの文字をスキップしたことを通知
          onLineEnd({
            timestamp: currentTime,
            leftover,
            completed: session.isCompleted?.() || false,
            combo: session.getCombo?.() || 0,
            maxCombo: session.getMaxCombo?.() || 0,
          });

          // 全体が完了した場合
          if (session.isCompleted?.()) {
            // 統計情報を含めて完了通知
            onComplete({
              result: { status: 'time_completed' },
              progress: 100,
              combo: session.getCombo?.() || 0,
              maxCombo: session.getMaxCombo?.() || 0,
            });
          }

          // スコア情報を更新
          updateScoreRef();

          // 表示情報を更新
          updateDisplayInfoRef();

          // レンダリング更新をスケジュール
          scheduleRenderUpdate();
        }
      } catch (error) {
        console.error('[useTypingInputOptimized] 更新処理エラー:', error);
      }
    }
  }, [
    sessionRef,
    completedRef,
    isCompleted,
    onLineEnd,
    onComplete,
    scheduleRenderUpdate,
  ]);

  /**
   * 定期更新を開始する
   */
  const startPeriodicUpdate = useCallback(() => {
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
    }

    updateTimerRef.current = setInterval(() => {
      updateSession();
    }, updateInterval);

    // 初回更新を即時実行
    updateSession();
  }, [updateSession, updateInterval]);

  /**
   * スコア情報をRefで更新（内部処理用）
   */
  const updateScoreRef = useCallback(() => {
    const session = sessionRef?.current;
    if (!session) return;

    // セッションからコンボ情報を取得
    const combo = session.getCombo?.() || 0;
    const maxCombo = session.getMaxCombo?.() || 0;

    // スコア情報を更新（refのみ）
    scoreRef.current = {
      ...scoreRef.current,
      combo,
      maxCombo,
    };
  }, [sessionRef]);

  /**
   * 表示情報をRefで更新（内部処理用）
   */
  const updateDisplayInfoRef = useCallback(() => {
    const session = sessionRef?.current;
    if (!session) return;

    try {
      // セッションから表示情報を取得
      const colorInfo = session.getColoringInfo?.() || {};

      // 表示情報を更新（refのみ）
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

      // 進捗情報も更新
      progressRef.current = session.getCompletionPercentage?.() || 0;
    } catch (error) {
      console.error('[useTypingInputOptimized] 表示情報更新エラー:', error);
    }
  }, [sessionRef]);

  /**
   * タイピング入力処理 - 超高速パフォーマンス版
   */
  const handleInput = useCallback(
    (key) => {
      // キー入力のセーフティチェック
      if (typeof key !== 'string') {
        return { success: false, reason: 'invalid_key' };
      }

      // 完了フラグをチェック
      if (completedRef.current || isCompleted) {
        return { success: false, reason: 'session_completed' };
      }

      // セッション存在確認
      const session = sessionRef.current;
      if (!session) {
        return { success: false, reason: 'session_not_found' };
      }

      // 入力キーを記録（refのみ）
      lastPressedKeyRef.current = key;
      inputStatsRef.current.totalKeyPresses++;
      inputStatsRef.current.lastKeyTime = Date.now();

      try {
        // 入力処理
        let result;
        const timestamp = Date.now();

        if (typeof session.accept === 'function') {
          // TypingManiaスタイルのacceptメソッドを使用
          const acceptResult = session.accept(key);

          // acceptの戻り値を変換
          if (acceptResult === 1) {
            // 正解
            result = { success: true, status: 'input_accepted' };
            // 完了チェック
            if (session.isCompleted?.()) {
              result.status = 'all_completed';
            }
          } else if (acceptResult === -1) {
            // 不正解
            result = { success: false, status: 'wrong_input' };
          } else {
            // 無効
            result = { success: false, status: 'invalid_input' };
          }
        } else if (typeof session.processInput === 'function') {
          // 従来のprocessInputメソッド
          result = session.processInput(key);
        } else {
          // 無効なセッション
          return { success: false, reason: 'invalid_session' };
        }

        if (result.success) {
          // 成功時の処理
          inputStatsRef.current.correctKeyPresses++;

          // 効果音再生
          if (playSound && soundSystem) {
            if (typeof soundSystem.ultraFastPlayTypingSound === 'function') {
              soundSystem.ultraFastPlayTypingSound('success');
            } else if (typeof soundSystem.playSound === 'function') {
              soundSystem.playSound('success');
            }
          }

          // 内部状態の更新
          updateScoreRef();
          updateDisplayInfoRef();

          // レンダリングの更新をスケジュール（複数のキー入力をバッチ処理）
          scheduleRenderUpdate();

          // 適切なタイミングでsetStateを使いUIを更新
          const isCompleted =
            result.status === 'all_completed' ||
            session.isCompleted?.() === true;

          // コールバック呼び出し
          onCorrectInput({
            key,
            displayInfo: displayInfoRef.current,
            progress: progressRef.current,
            result,
          });

          if (isCompleted) {
            if (DEBUG_MODE)
              console.log('[useTypingInputOptimized] 入力完了を検出しました');

            // 完了時は状態をすぐに更新
            setProgressForRendering(100);

            // 完了通知
            onComplete({
              result: { status: 'all_completed' },
              displayInfo: displayInfoRef.current,
              progress: 100,
              combo: session.getCombo?.() || 0,
              maxCombo: session.getMaxCombo?.() || 0,
            });
          }

          return {
            success: true,
            displayInfo: displayInfoRef.current,
            progress: progressRef.current,
          };
        } else {
          // 不正解時の処理
          inputStatsRef.current.incorrectKeyPresses++;

          // 効果音再生
          if (playSound && soundSystem) {
            if (typeof soundSystem.ultraFastPlayTypingSound === 'function') {
              soundSystem.ultraFastPlayTypingSound('error');
            } else if (typeof soundSystem.playSound === 'function') {
              soundSystem.playSound('error');
            }
          }

          // エラーアニメーションはすぐに表示
          showErrorAnimation();

          // スコアを更新（コンボリセット時）
          updateScoreRef();
          scheduleRenderUpdate();

          // 期待されるキー
          const expectedKey = session.getCurrentExpectedKey?.() || '';

          // コールバック呼び出し
          onIncorrectInput({
            key,
            expectedKey,
            timestamp: Date.now(),
          });

          return { success: false, reason: 'incorrect_input' };
        }
      } catch (error) {
        console.error('[useTypingInputOptimized] 入力処理エラー:', error);
        return { success: false, reason: 'processing_error', error };
      }
    },
    [
      sessionRef,
      completedRef,
      isCompleted,
      playSound,
      soundSystem,
      showErrorAnimation,
      onCorrectInput,
      onIncorrectInput,
      onComplete,
      updateScoreRef,
      updateDisplayInfoRef,
      scheduleRenderUpdate,
    ]
  );

  /**
   * 初期化処理 - リアルタイム更新の開始
   */
  useEffect(() => {
    // リアルタイム更新を開始
    startPeriodicUpdate();

    // アンマウント時にタイマーをクリア
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }

      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
        updateTimerRef.current = null;
      }

      if (renderUpdateTimerRef.current) {
        cancelAnimationFrame(renderUpdateTimerRef.current);
        renderUpdateTimerRef.current = null;
      }
    };
  }, [startPeriodicUpdate]);

  return {
    // 高速処理用のメソッド
    handleInput,

    // レンダリング用の状態
    errorAnimation,
    lastPressedKey,
    score,
    displayInfo: displayInfoForRendering,
    progress: progressForRendering,

    // 内部参照（デバッグ用）
    inputStatsRef,
  };
}
