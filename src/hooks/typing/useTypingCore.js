'use client';

/**
 * useTypingCore.js
 * タイピングゲームのコア機能を提供するカスタムフック
 * 責任: タイピングセッションの基本的な状態管理とデータ処理
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import TypingUtils from '@/utils/TypingUtils';

/**
 * タイピングセッションのコア状態管理
 * @param {Object} options 設定オプション
 * @returns {Object} セッション管理の状態とメソッド
 */
export function useTypingCore(options = {}) {
  const {
    initialProblem = null,
    onProblemStateChange = () => { },
    onSessionInitialized = () => { },
  } = options;

  // タイピングセッション
  const sessionRef = useRef(null);

  // 基本状態フラグ
  const completedRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // 表示情報
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
  const [progressPercentage, setProgressPercentage] = useState(0);

  /**
   * 問題データの検証
   */
  const validateProblem = useCallback((problem) => {
    if (!problem) return false;
    if (!problem.kanaText || typeof problem.kanaText !== 'string') return false;
    if (!problem.displayText || typeof problem.displayText !== 'string') return false;
    return true;
  }, []);

  /**
   * セッション初期化処理
   */  const initializeSession = useCallback((problem) => {
    // 問題データの検証
    if (!validateProblem(problem)) {
      console.warn('[useTypingCore] 無効な問題データです', problem);
      return false;
    }

    try {
      // 新しいタイピングセッションを作成
      const session = TypingUtils.createTypingSession(problem);
      if (!session) {
        console.error('[useTypingCore] セッションの作成に失敗しました');
        return false;
      }

      // セッションを保存
      sessionRef.current = session;
      completedRef.current = false;      // 表示情報を初期化
      const colorInfo = session.getColoringInfo();

      console.log('[useTypingCore] 初期化時の表示情報:', {
        romaji: (colorInfo.romaji || '').substring(0, 30) + '...',
        currentCharIndex: colorInfo.currentCharIndex || 0,
        expectedNextChar: colorInfo.expectedNextChar || '',
      });
      // 表示情報を初期値として設定
      const initialDisplayInfo = {
        romaji: colorInfo.romaji || '',
        typedLength: 0,
        currentInputLength: colorInfo.currentInputLength || 0,
        currentCharIndex: colorInfo.currentCharIndex || 0,
        currentInput: colorInfo.currentInput || '',
        expectedNextChar: colorInfo.expectedNextChar || '',
        currentCharRomaji: colorInfo.currentCharRomaji || '',
      };

      // 表示情報を更新
      setDisplayInfo(initialDisplayInfo);

      // 進捗をリセット
      setProgressPercentage(0);

      // 完了フラグをリセット
      setIsCompleted(false);

      // 初期化完了
      setIsInitialized(true);

      // コールバック呼び出し
      onSessionInitialized(session);

      return true;
    } catch (error) {
      console.error('[useTypingCore] セッション初期化エラー:', error);
      return false;
    }
  }, [validateProblem]);

  /**
   * 次に入力すべきキーを取得
   */
  const getExpectedNextKey = useCallback(() => {
    if (!sessionRef.current) return '';
    return sessionRef.current.getCurrentExpectedKey() || '';
  }, []);

  /**
   * 進捗パーセンテージを取得
   */
  const getProgress = useCallback(() => {
    if (!sessionRef.current) return 0;
    return sessionRef.current.getCompletionPercentage();
  }, []);

  /**
   * 完了状態を設定
   */
  const markAsCompleted = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsCompleted(true);
    setProgressPercentage(100);

    // 状態変更通知
    onProblemStateChange({
      type: 'completed',
      progress: 100
    });
  }, [onProblemStateChange]);
  /**
   * 初期問題の設定（マウント時または問題変更時）
   */
  useEffect(() => {
    if (initialProblem) {
      // 初期化を一度だけ行うようにするためのフラグを使う
      const shouldInitialize = !isInitialized ||
        (initialProblem?.displayText !== sessionRef.current?.displayText);

      if (shouldInitialize) {
        initializeSession(initialProblem);
      }
    }
  }, [initialProblem, initializeSession, isInitialized]);

  // 公開API
  return {
    // 状態
    isInitialized,
    isCompleted,
    displayInfo,
    progressPercentage,

    // 参照
    sessionRef,
    completedRef,

    // メソッド
    initializeSession,
    markAsCompleted,
    getExpectedNextKey,
    getProgress,

    // 状態更新
    setDisplayInfo,
    setProgressPercentage,
  };
}
