'use client';

/**
 * useTypingInput.js
 * タイピング入力処理に特化したフック
 * 責任: キー入力処理とフィードバック
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import TypingUtils from '@/utils/TypingUtils';

/**
 * タイピング入力処理（リファクタリング・安定化版 2025年5月12日）
 * @param {Object} options 設定オプション
 * @returns {Object} 入力処理の状態とメソッド
 */
export function useTypingInput(options = {}) {
  // オプションのセーフティチェック
  const {
    sessionRef,
    isCompleted,
    completedRef,
    onCorrectInput = () => {},
    onIncorrectInput = () => {},
    onComplete = () => {},
    onLineEnd = () => {}, // 行の終了時コールバック（タイムベース更新用）
    playSound = true,
    soundSystem = null,
    updateInterval = 16, // アニメーションフレームレートに合わせて約60fps
  } = options || {};

  // デバッグモード設定
  const DEBUG_MODE = process.env.NODE_ENV === 'development' && false; // 必要に応じて有効化

  // デバッグログ関数
  const debugLog = useCallback(
    (message, ...args) => {
      if (DEBUG_MODE) console.log(`[useTypingInput] ${message}`, ...args);
    },
    [DEBUG_MODE]
  );

  // 入力統計情報
  const inputStatsRef = useRef({
    totalKeyPresses: 0,
    correctKeyPresses: 0,
    incorrectKeyPresses: 0,
    lastKeyTime: 0,
    averageLatency: 0,
  });

  // スコア情報
  const [score, setScore] = useState({
    points: 0,
    combo: 0,
    maxCombo: 0,
  });

  // エラーアニメーション状態
  const [errorAnimation, setErrorAnimation] = useState(false);
  const errorTimerRef = useRef(null);

  // 最後に押されたキー
  const [lastPressedKey, setLastPressedKey] = useState('');

  // アップデート用タイマー
  const updateTimerRef = useRef(null);

  // セッション有効性チェック用
  const isValidSessionRef = useRef(false);

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
   * TypingManiaの update メソッドを参考に実装
   */
  const updateSession = useCallback(() => {
    // 高速パスチェック - セッション存在確認
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

          // スコア更新
          updateScore();
        }
      } catch (error) {
        console.error('[useTypingInput] 更新処理エラー:', error);
      }
    }
  }, [sessionRef, completedRef, isCompleted, onLineEnd, onComplete]);

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
   * スコア情報を更新
   */
  const updateScore = useCallback(() => {
    const session = sessionRef?.current;
    if (!session) return;

    // セッションからコンボ情報を取得
    const combo = session.getCombo?.() || 0;
    const maxCombo = session.getMaxCombo?.() || 0;

    // スコア情報を更新
    setScore((prevScore) => {
      // 不要な更新を避ける
      if (prevScore.combo === combo && prevScore.maxCombo === maxCombo) {
        return prevScore;
      }
      return { ...prevScore, combo, maxCombo };
    });
  }, [sessionRef]);

  /**
   * タイピング入力処理 - 超高速パフォーマンス版（リファクタリング・安定化版 2025年5月12日）
   */
  const handleInput = useCallback(
    (key) => {
      // キー入力のセーフティチェック（最小限に）
      if (typeof key !== 'string') {
        debugLog('無効なキー入力:', key);
        return { success: false, reason: 'invalid_key' };
      }

      // 高速パスチェック - 完了フラグを最初にチェック
      if (completedRef.current || isCompleted) {
        // 設定済みの最終状態を維持（状態変更なし）
        return { success: false, reason: 'session_completed' };
      }

      // 高速パスチェック - セッション存在確認
      const session = sessionRef.current;
      if (!session) {
        return { success: false, reason: 'session_not_found' };
      }

      // パフォーマンス計測開始
      const startProcessingTime = performance.now();

      // 入力キーを記録（React状態更新を遅延させて高速化）
      queueMicrotask(() => {
        // 入力統計を更新
        inputStatsRef.current.totalKeyPresses++;
        inputStatsRef.current.lastKeyTime = Date.now();
        // 状態更新の最小化
        setLastPressedKey((prevKey) => (prevKey !== key ? key : prevKey));
      });

      try {
        // acceptメソッドとprocessInputメソッドで柔軟に対応
        let result;
        const timestamp = Date.now();

        if (typeof session.accept === 'function') {
          // TypingManiaスタイルのacceptメソッドを優先使用
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
            // 無効（通常ここには来ないはず）
            result = { success: false, status: 'invalid_input' };
          }
        } else if (typeof session.processInput === 'function') {
          // 従来のprocessInputメソッドをフォールバックで使用
          result = session.processInput(key);
        } else {
          // 無効なセッションエラー
          return { success: false, reason: 'invalid_session' };
        }

        // パフォーマンスモニタリング（条件付き）
        if (DEBUG_MODE) {
          const processingTime = performance.now() - startProcessingTime;
          if (processingTime > 5) {
            // 5ms以上かかった場合のみ記録
            debugLog(
              `入力処理パフォーマンス警告: ${processingTime.toFixed(2)}ms`
            );
          }
        }

        if (result.success) {
          // 統計情報の更新を遅延処理に移動（レスポンス優先）
          queueMicrotask(() => {
            inputStatsRef.current.correctKeyPresses++;
          });

          // 効果音再生の高速化と安定性の改善（GitHub Pages対応）
          const canPlaySound =
            playSound &&
            soundSystem &&
            typeof soundSystem.playSound === 'function';
          if (canPlaySound) {
            // 即時呼び出しで確実に再生を試みる
            try {
              soundSystem.playSound('success');
            } catch (e) {
              // エラー発生時のフォールバック - キュー追加で再試行
              queueMicrotask(() => {
                try {
                  soundSystem.playSound('success');
                } catch (fallbackError) {
                  // エラー発生時も処理を継続
                  console.warn(
                    '効果音再生のフォールバックでも失敗',
                    fallbackError
                  );
                }
              });
            }
          }

          // 表示情報と進捗情報を取得
          let colorInfo = {};
          let progress = 0;

          try {
            // 高速アクセス - 最小限のチェック
            colorInfo = session.getColoringInfo?.() || {};
            progress = session.getCompletionPercentage?.() || 0;
          } catch (e) {
            console.error('[useTypingInput] 情報取得エラー:', e);
          }

          // 安全な表示情報を構築
          const displayInfo = {
            romaji: colorInfo.romaji || '',
            typedLength: colorInfo.typedLength || 0,
            currentInputLength: colorInfo.currentInputLength || 0,
            currentCharIndex: colorInfo.currentCharIndex || 0,
            currentInput: colorInfo.currentInput || '',
            expectedNextChar: colorInfo.expectedNextChar || '',
            currentCharRomaji: colorInfo.currentCharRomaji || '',
            updated: Date.now(),
          };

          // スコア情報を更新
          updateScore(); // コールバック呼び出しと完了チェック
          onCorrectInput({ key, displayInfo, progress, result });

          // 完了判定を強化（result.statusだけでなく、sessionの完了状態も確認）
          const isCompleted =
            result.status === 'all_completed' ||
            session.isCompleted?.() === true;
          if (isCompleted) {
            if (DEBUG_MODE)
              console.log('[useTypingInput] 入力完了を検出しました', {
                resultStatus: result.status,
                sessionCompleted: session.isCompleted?.(),
              });
            // 統計情報を含めて完了通知
            onComplete({
              result: { status: 'all_completed' }, // 常に完了ステータスを送信
              displayInfo,
              progress: 100, // 完了時は100%を保証
              combo: session.getCombo?.() || 0,
              maxCombo: session.getMaxCombo?.() || 0,
            });
          }

          return { success: true, displayInfo, progress };
        } else {
          // 不正解時の処理 - 効率化とGitHub Pages対応
          if (playSound && soundSystem) {
            try {
              // 即時実行を試行
              soundSystem.playSound('error');
            } catch (e) {
              console.warn('エラー音の再生に失敗、再試行します:', e);
              // フォールバック - キューに追加して再試行
              queueMicrotask(() => {
                try {
                  soundSystem.playSound('error');
                } catch (fallbackError) {
                  // 無視 - ユーザー体験維持のため処理継続
                }
              });
            }
          }

          // エラーアニメーション表示
          showErrorAnimation();

          // スコア情報を更新（コンボがリセットされるため）
          updateScore();

          // 期待されるキー
          const expectedKey = session.getCurrentExpectedKey?.() || '';

          // デバッグ情報（条件付き）
          if (DEBUG_MODE) {
            debugLog('不正解入力:', {
              入力キー: key,
              期待キー: expectedKey,
            });
          }

          // コールバック呼び出し
          onIncorrectInput({
            key,
            expectedKey,
            timestamp: Date.now(),
          });

          return { success: false, reason: 'incorrect_input' };
        }
      } catch (error) {
        console.error('[useTypingInput] 入力処理エラー:', error);
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
      updateScore,
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
    };
  }, [startPeriodicUpdate]);

  return {
    handleInput,
    errorAnimation,
    lastPressedKey,
    setLastPressedKey,
    score,
    updateSession,
  };
}
