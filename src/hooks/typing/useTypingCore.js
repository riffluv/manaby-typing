'use client';

/**
 * useTypingCore.js
 * タイピングゲームのコア機能を提供するカスタムフック
 * 責任: タイピングセッションの基本的な状態管理とデータ処理
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import TypingUtils from '@/utils/TypingUtils';

/**
 * タイピングセッションのコア状態管理（リファクタリング・安定化版 2025年5月12日）
 * @param {Object} options 設定オプション
 * @returns {Object} セッション管理の状態とメソッド
 */
export function useTypingCore(options = {}) {
  // オプションのセーフティチェック
  const {
    initialProblem = null,
    onProblemStateChange = () => {},
    onSessionInitialized = () => {},
  } = options || {};

  // デバッグモード設定
  const DEBUG_MODE = process.env.NODE_ENV === 'development' && false; // 必要に応じて有効化

  // デバッグログ関数
  const debugLog = useCallback(
    (message, ...args) => {
      if (DEBUG_MODE) console.log(`[useTypingCore] ${message}`, ...args);
    },
    [DEBUG_MODE]
  );

  // タイピングセッション
  const sessionRef = useRef(null);

  // 基本状態フラグ - メタデータ追加
  const completedRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const sessionStatusRef = useRef({
    initTime: 0,
    lastUpdateTime: 0,
    errorCount: 0,
    hasValidRomaji: false,
  });

  // 表示情報（デフォルトを安全な型で定義）
  const [displayInfo, setDisplayInfo] = useState({
    romaji: '',
    typedLength: 0,
    currentInputLength: 0,
    currentCharIndex: 0,
    currentInput: '',
    expectedNextChar: '',
    currentCharRomaji: '',
    updated: Date.now(), // 更新時刻を追加
  });

  // 進捗情報
  const [progressPercentage, setProgressPercentage] = useState(0);

  /**
   * 問題データの検証
   */
  const validateProblem = useCallback((problem) => {
    if (!problem) return false;
    if (!problem.kanaText || typeof problem.kanaText !== 'string') return false;
    if (!problem.displayText || typeof problem.displayText !== 'string')
      return false;
    return true;
  }, []);
  /**
   * セッション初期化処理（リファクタリング・安定化版 2025年5月12日）
   */
  const initializeSession = useCallback(
    (problem) => {
      // 問題データの検証（厳密化）
      if (!validateProblem(problem)) {
        console.warn(
          '[useTypingCore] 無効な問題データです',
          problem ? JSON.stringify(problem).substring(0, 100) : 'undefined'
        );
        return false;
      }

      // セッション初期化時刻を記録
      sessionStatusRef.current.initTime = Date.now();

      // 問題データログ（デバッグ用）
      debugLog('問題データ初期化:', {
        displayText: problem.displayText,
        kanaText: problem.kanaText
          ? problem.kanaText.length > 20
            ? problem.kanaText.substring(0, 20) + '...'
            : problem.kanaText
          : '<なし>',
        timestamp: new Date().toLocaleTimeString(),
      });

      try {
        // 既存セッションのクリーンアップ
        if (sessionRef.current) {
          debugLog('既存セッションをクリーンアップします');
          // 必要に応じてクリーンアップ処理を追加
        }

        // 新しいタイピングセッションを作成（エラーハンドリング強化）
        const session = TypingUtils.createTypingSession(problem);
        if (!session) {
          console.error('[useTypingCore] セッションの作成に失敗しました');
          sessionStatusRef.current.errorCount++;
          return false;
        }

        // セッションを保存
        sessionRef.current = session;
        completedRef.current = false;

        // 表示情報を初期化（安全性確認）
        const colorInfo = session.getColoringInfo();

        // ローマ字データの有効性確認
        const hasValidRomaji =
          colorInfo &&
          typeof colorInfo.romaji === 'string' &&
          colorInfo.romaji.length > 0;
        sessionStatusRef.current.hasValidRomaji = hasValidRomaji;

        if (!hasValidRomaji) {
          console.warn(
            '[useTypingCore] 有効なローマ字データが取得できませんでした',
            colorInfo
          );
        }
        debugLog('初期化時の表示情報:', {
          romaji:
            colorInfo && colorInfo.romaji
              ? colorInfo.romaji.substring(0, 30) +
                (colorInfo.romaji.length > 30 ? '...' : '')
              : '<なし>',
          currentCharIndex: colorInfo?.currentCharIndex ?? 0,
          expectedNextChar: colorInfo?.expectedNextChar ?? '',
          valid: !!colorInfo && typeof colorInfo.romaji === 'string',
        });

        // 表示情報を初期値として設定（セーフティチェック強化）
        const initialDisplayInfo = {
          romaji: colorInfo?.romaji || '',
          typedLength: 0,
          currentInputLength: colorInfo?.currentInputLength ?? 0,
          currentCharIndex: colorInfo?.currentCharIndex ?? 0,
          currentInput: colorInfo?.currentInput || '',
          expectedNextChar: colorInfo?.expectedNextChar || '',
          currentCharRomaji: colorInfo?.currentCharRomaji || '',
          updated: Date.now(), // 更新時刻を含める
        };

        // 無効なデータチェック
        if (!initialDisplayInfo.romaji) {
          console.warn('[useTypingCore] 表示用ローマ字が生成されませんでした');
          initialDisplayInfo.romaji = ''; // 安全な初期値を確保
        }

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
    },
    [validateProblem]
  );

  /**
   * 表示データを設定
   */
  const setDisplayData = useCallback((data) => {
    setDisplayInfo(data);
  }, []);
  /**
   * 完了状態を更新
   */ const setCompleted = useCallback(
    (state) => {
      try {
        setIsCompleted(state);
        if (state === true) {
          completedRef.current = true;
        }
        if (DEBUG_MODE)
          console.log(`[useTypingCore] 完了状態を更新しました:`, state);
      } catch (error) {
        console.error(
          '[useTypingCore] 完了状態の更新でエラーが発生しました:',
          error
        );
      }
    },
    [DEBUG_MODE]
  );

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
      progress: 100,
    });
  }, [onProblemStateChange]);
  /**
   * 初期問題の設定（マウント時または問題変更時）
   */
  useEffect(() => {
    if (initialProblem) {
      // 初期化を一度だけ行うようにするためのフラグを使う
      const shouldInitialize =
        !isInitialized ||
        initialProblem?.displayText !== sessionRef.current?.displayText;

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
    setDisplayData,
    setCompleted,

    // 状態更新
    setDisplayInfo,
    setProgressPercentage,
  };
}
