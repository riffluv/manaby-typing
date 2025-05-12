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
    onCorrectInput = () => { },
    onIncorrectInput = () => { },
    onComplete = () => { },
    playSound = true,
    soundSystem = null,
  } = options || {};

  // デバッグモード設定
  const DEBUG_MODE = process.env.NODE_ENV === 'development' && false; // 必要に応じて有効化

  // デバッグログ関数
  const debugLog = useCallback((message, ...args) => {
    if (DEBUG_MODE) console.log(`[useTypingInput] ${message}`, ...args);
  }, [DEBUG_MODE]);

  // 入力統計情報
  const inputStatsRef = useRef({
    totalKeyPresses: 0,
    correctKeyPresses: 0,
    incorrectKeyPresses: 0,
    lastKeyTime: 0,
    averageLatency: 0
  });

  // エラーアニメーション状態
  const [errorAnimation, setErrorAnimation] = useState(false);
  const errorTimerRef = useRef(null);

  // 最後に押されたキー
  const [lastPressedKey, setLastPressedKey] = useState('');

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
   * タイピング入力処理 - 高速パフォーマンス版（リファクタリング・安定化版 2025年5月12日）
   */
  const handleInput = useCallback((key) => {
    // キー入力のセーフティチェック
    if (typeof key !== 'string') {
      debugLog('無効なキー入力:', key);
      return { success: false, reason: 'invalid_key' };
    }

    // 入力統計を更新
    inputStatsRef.current.totalKeyPresses++;
    inputStatsRef.current.lastKeyTime = Date.now();

    // 入力キーを記録
    setLastPressedKey(key);

    // セッションのセーフティチェック（詳細な診断情報を含める）
    const session = sessionRef.current;
    if (!session) {
      debugLog('セッションが存在しません');
      return { success: false, reason: 'session_not_found' };
    }

    if (completedRef.current || isCompleted) {
      debugLog('セッションは既に完了しています');
      return { success: false, reason: 'session_completed' };
    }

    // processInput関数の存在確認
    if (typeof session.processInput !== 'function') {
      console.error('[useTypingInput] セッションにprocessInput関数がありません', session);
      return { success: false, reason: 'invalid_session' };
    }

    try {
      // 入力処理開始時刻
      const startTime = performance.now();

      // 入力を処理（直接処理で高速化）
      const result = session.processInput(key);

      // 処理時間を計測
      const processingTime = performance.now() - startTime;

      // 処理結果のセーフティチェック
      if (!result) {
        debugLog('processInputが無効な結果を返しました');
        return { success: false, reason: 'invalid_result' };
      }

      if (result.success) {
        // 統計情報を更新
        inputStatsRef.current.correctKeyPresses++;

        // 正解時の処理
        // 効果音再生（セーフティチェック付き）
        if (playSound && soundSystem && typeof soundSystem.playSound === 'function') {
          soundSystem.playSound('success');
        }        // 表示情報の取得とセーフティチェック
        let colorInfo;
        try {
          colorInfo = typeof session.getColoringInfo === 'function' ? session.getColoringInfo() : null;

          // 返り値の有効性を確認
          if (!colorInfo || typeof colorInfo !== 'object') {
            debugLog('無効な表示情報が返されました', colorInfo);
            colorInfo = {}; // フォールバック
          }
        } catch (e) {
          console.error('[useTypingInput] 表示情報取得エラー:', e);
          colorInfo = {}; // エラー時のフォールバック
        }

        // 安全な表示情報を構築（全てのフィールドを適切にチェック）
        const displayInfo = {
          romaji: typeof colorInfo.romaji === 'string' ? colorInfo.romaji : '',
          typedLength: typeof colorInfo.typedLength === 'number' ? colorInfo.typedLength : 0,
          currentInputLength: typeof colorInfo.currentInputLength === 'number' ? colorInfo.currentInputLength : 0,
          currentCharIndex: typeof colorInfo.currentCharIndex === 'number' ? colorInfo.currentCharIndex : 0,
          currentInput: typeof colorInfo.currentInput === 'string' ? colorInfo.currentInput : '',
          expectedNextChar: typeof colorInfo.expectedNextChar === 'string' ? colorInfo.expectedNextChar : '',
          currentCharRomaji: typeof colorInfo.currentCharRomaji === 'string' ? colorInfo.currentCharRomaji : '',
          updated: Date.now() // 更新時刻を追加
        };

        // ローマ字が有効かチェック（トラブルシューティング用）
        if (!displayInfo.romaji && result.success) {
          console.warn('[useTypingInput] 正解判定なのにローマ字が空です', { key, result });
        }

        // 進捗を取得（セーフティチェック付き）
        let progress = 0;
        try {
          progress = typeof session.getCompletionPercentage === 'function' ?
            session.getCompletionPercentage() : 0;

          // 数値型チェック
          progress = typeof progress === 'number' ? progress : 0;
        } catch (e) {
          console.error('[useTypingInput] 進捗取得エラー:', e);
        }

        // コールバック呼び出し
        onCorrectInput({ key, displayInfo, progress, result });        // 完了チェック - 即時処理
        if (result.status === 'all_completed') {
          // 統計情報を含めて完了通知
          onComplete({ result, displayInfo, progress });
        }

        return { success: true, displayInfo, progress };
      } else {        // 不正解時の処理
        // 効果音再生
        if (playSound && soundSystem) {
          soundSystem.playSound('error');
        }

        // エラーアニメーション表示
        showErrorAnimation();

        // 期待されるキーを取得
        const expectedKey = session.getCurrentExpectedKey() || '';

        // ログ出力 - ミスの詳細を記録
        console.log('[useTypingInput] 不正解入力:', {
          入力キー: key,
          期待キー: expectedKey,
          一致: key === expectedKey
        });

        // コールバック呼び出し - 詳細情報を追加
        onIncorrectInput({
          key,
          expectedKey,
          timestamp: Date.now()
        });

        return { success: false, reason: 'incorrect_input' };
      }
    } catch (error) {
      console.error('[useTypingInput] 入力処理エラー:', error);
      return { success: false, reason: 'processing_error', error };
    }
  }, [
    sessionRef,
    completedRef,
    isCompleted,
    playSound,
    soundSystem,
    showErrorAnimation,
    onCorrectInput,
    onIncorrectInput,
    onComplete
  ]);

  /**
   * クリーンアップ処理
   */
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, []);

  return {
    handleInput,
    errorAnimation,
    lastPressedKey,
    setLastPressedKey,
  };
}
