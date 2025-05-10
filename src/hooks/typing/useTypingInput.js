'use client';

/**
 * useTypingInput.js
 * タイピング入力処理に特化したフック
 * 責任: キー入力処理とフィードバック
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import TypingUtils from '@/utils/TypingUtils';

/**
 * タイピング入力処理
 * @param {Object} options 設定オプション
 * @returns {Object} 入力処理の状態とメソッド
 */
export function useTypingInput(options = {}) {
  const {
    sessionRef,
    isCompleted,
    completedRef,
    onCorrectInput = () => { },
    onIncorrectInput = () => { },
    onComplete = () => { },
    playSound = true,
    soundSystem = null,
  } = options;

  // エラーアニメーション状態
  const [errorAnimation, setErrorAnimation] = useState(false);
  const errorTimerRef = useRef(null);

  // 最後に押されたキー
  const [lastPressedKey, setLastPressedKey] = useState('');

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
   * タイピング入力処理 - 高速パフォーマンス版
   */
  const handleInput = useCallback((key) => {
    // 入力キーを記録
    setLastPressedKey(key);

    // セッションがない場合や完了済みの場合は何もしない
    const session = sessionRef.current;
    if (!session || completedRef.current || isCompleted) {
      return { success: false, reason: 'session_unavailable' };
    }

    try {
      // 入力を処理（直接処理で高速化）
      const result = session.processInput(key);

      if (result.success) {
        // 正解時の処理
        // 効果音再生
        if (playSound && soundSystem) {
          soundSystem.playSound('success');
        }

        // 表示情報の更新
        const colorInfo = session.getColoringInfo();
        const displayInfo = {
          romaji: colorInfo.romaji || '',
          typedLength: colorInfo.typedLength || 0,
          currentInputLength: colorInfo.currentInputLength || 0,
          currentCharIndex: colorInfo.currentCharIndex || 0,
          currentInput: colorInfo.currentInput || '',
          expectedNextChar: colorInfo.expectedNextChar || '',
          currentCharRomaji: colorInfo.currentCharRomaji || '',
        };

        // 進捗を取得
        const progress = session.getCompletionPercentage();

        // コールバック呼び出し
        onCorrectInput({ key, displayInfo, progress, result });        // 完了チェック - 即時処理
        if (result.status === 'all_completed') {
          // 統計情報を含めて完了通知
          onComplete({ result, displayInfo, progress });
        }

        return { success: true, displayInfo, progress };
      } else {
        // 不正解時の処理
        // 効果音再生
        if (playSound && soundSystem) {
          soundSystem.playSound('error');
        }

        // エラーアニメーション表示
        showErrorAnimation();

        // コールバック呼び出し
        onIncorrectInput({ key });

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
