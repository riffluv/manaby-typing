'use client';

/**
 * useOptimizedTyping.js
 * 最適化されたタイピングゲームの統合フック
 * パフォーマンスを極限まで向上させるための実装
 * 
 * 2025年5月改修:
 * - タイピング処理をメインスレッドで実行し、レスポンス性能を向上
 * - スコア計算のみWorkerに委譲し、CPUリソースを効率活用
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TypingUtils from '@/utils/TypingUtils';

// デフォルトサウンドシステム
const DEFAULT_SOUND_SYSTEM = {
  playSound: () => { }, // 無効なデフォルト実装
};

/**
 * 最適化されたタイピングゲーム（フラット構造で最適化）
 * すべての処理を1つのフックにまとめて関数呼び出しオーバーヘッドを削減
 * 
 * @param {Object} options 設定オプション
 * @returns {Object} タイピングゲーム制御API
 */
export function useOptimizedTyping(options = {}) {
  const {
    initialProblem = null,
    playSound = true,
    soundSystem = DEFAULT_SOUND_SYSTEM,
    onProblemComplete = () => { },
    onDebugInfoUpdate = null,
  } = options;

  // セッション状態 - 直接アクセス用Ref
  const sessionRef = useRef(null);
  
  // コア状態フラグ（レンダリングに関係するものだけstate化）
  const completedRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // 表示情報 - メモ化パターンで最適化
  const [displayData, setDisplayData] = useState({
    romaji: '',
    typedLength: 0,
    currentInputLength: 0,
    currentCharIndex: 0,
    currentInput: '',
    expectedNextChar: '',
    currentCharRomaji: '',
  });

  // 進捗表示
  const [progressPercentage, setProgressPercentage] = useState(0);

  // 統計情報 - 参照で管理（再レンダリング防止）
  const statsRef = useRef({
    correctKeyCount: 0,
    mistakeCount: 0,
    startTime: null,
    currentProblemStartTime: null,
    problemStats: [],
  });

  // 表示用統計情報 - UIのみ反映
  const [displayStats, setDisplayStats] = useState({
    correctKeyCount: 0,
    mistakeCount: 0,
    kpm: 0,
    rank: 'F',
  });

  // UI状態
  const [errorAnimation, setErrorAnimation] = useState(false);
  const [lastPressedKey, setLastPressedKey] = useState('');

  // タイマー参照
  const errorTimerRef = useRef(null);
  const statsUpdateTimerRef = useRef(null);

  // デバッグ情報
  const debugInfoRef = useRef({});

  // 最適化定数
  const PROGRESS_UPDATE_THRESHOLD = 5; // 進捗更新の閾値
  const STATS_UPDATE_INTERVAL = 100;   // 統計更新間隔(ms)

  /**
   * 問題完了時の処理
   */
  const handleProblemComplete = useCallback(() => {
    // 既に完了済みなら何もしない
    if (completedRef.current) return;

    // 完了フラグを設定
    completedRef.current = true;
    setIsCompleted(true);
    
    // 最終的な表示進捗を100%に
    setProgressPercentage(100);

    // 問題ごとの統計情報を計算
    const now = Date.now();
    const stats = statsRef.current;
    const problemElapsedMs = stats.currentProblemStartTime
      ? now - stats.currentProblemStartTime
      : 0;
    const problemKeyCount = stats.correctKeyCount || 0;
    const problemMistakeCount = stats.mistakeCount || 0;

    // 問題データ作成
    const problemData = {
      problemKeyCount,
      problemElapsedMs,
      problemMistakeCount,
      problemKPM: problemElapsedMs > 0
        ? Math.floor((problemKeyCount / (problemElapsedMs / 60000)))
        : 0,
      timestamp: now,
    };

    // 統計情報を更新
    const updatedProblemStats = [...(stats.problemStats || []), problemData];
    stats.problemStats = updatedProblemStats;

    // 表示用統計を更新
    updateDisplayStats();

    // コールバック呼び出し
    onProblemComplete({
      problemKeyCount,
      problemElapsedMs,
      problemKPM: problemData.problemKPM,
      problemMistakeCount,
      updatedProblemKPMs: updatedProblemStats.map(p => p.problemKPM || 0),
      problemStats: updatedProblemStats
    });
  }, [onProblemComplete]);

  /**
   * 表示用統計情報更新
   */
  const updateDisplayStats = useCallback(() => {
    const stats = statsRef.current;
    const correctCount = stats.correctKeyCount;
    const missCount = stats.mistakeCount;

    // KPM計算
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

    // 表示用統計情報の更新 (オブジェクト生成を最小限に)
    setDisplayStats(prev => {
      if (
        prev.correctKeyCount === correctCount &&
        prev.mistakeCount === missCount &&
        prev.kpm === kpm &&
        prev.rank === rank
      ) {
        return prev;  // 変更がない場合は再レンダリングを防ぐ
      }
      
      return {
        correctKeyCount: correctCount,
        mistakeCount: missCount,
        kpm,
        rank,
      };
    });

    // デバッグ情報更新
    if (onDebugInfoUpdate) {
      const newStats = { correctCount, missCount, kpm, rank };
      
      if (
        !debugInfoRef.current.stats ||
        JSON.stringify(debugInfoRef.current.stats) !== JSON.stringify(newStats)
      ) {
        debugInfoRef.current = {
          ...debugInfoRef.current,
          stats: newStats,
        };
        onDebugInfoUpdate(debugInfoRef.current);
      }
    }
  }, [onDebugInfoUpdate]);

  /**
   * 正解キー入力のカウント
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
    
    // 統計情報更新をスケジュール (頻度を下げて最適化)
    if (!statsUpdateTimerRef.current) {
      statsUpdateTimerRef.current = setTimeout(() => {
        updateDisplayStats();
        statsUpdateTimerRef.current = null;
      }, STATS_UPDATE_INTERVAL);
    }
  }, [updateDisplayStats]);

  /**
   * ミス入力のカウント
   */
  const countMistake = useCallback(() => {
    statsRef.current.mistakeCount += 1;
    
    // 統計情報を即時更新
    setDisplayStats(prev => ({
      ...prev,
      mistakeCount: statsRef.current.mistakeCount
    }));
  }, []);

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
    }, 150);  // 短い時間でリセット（レスポンス改善）
  }, []);

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
      previousProblemMistakeCount: keepHistory ? currentStats.mistakeCount || 0 : 0,
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
   * タイピングセッション初期化
   */
  const initializeSession = useCallback((problem) => {
    if (!problem) return false;
    
    try {
      // タイマーをクリア
      if (statsUpdateTimerRef.current) {
        clearTimeout(statsUpdateTimerRef.current);
        statsUpdateTimerRef.current = null;
      }
      
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
      
      // 新しいタイピングセッション作成 (高速版)
      const session = TypingUtils.createTypingSession(problem);
      if (!session) return false;
      
      // セッション保存
      sessionRef.current = session;
      
      // 状態リセット
      completedRef.current = false;
      setIsCompleted(false);
      setErrorAnimation(false);
      setProgressPercentage(0);
      
      // 表示情報初期化
      const colorInfo = session.getColoringInfo();
      setDisplayData({
        romaji: session.displayRomaji || '',
        typedLength: 0,
        currentInputLength: 0,
        currentCharIndex: 0,
        currentInput: '',
        expectedNextChar: session.getCurrentExpectedKey() || '',
        currentCharRomaji: session.patterns[0] ? session.patterns[0][0] : '',
      });
      
      // 統計情報リセット
      resetStats();
      
      // 初期化完了
      setIsInitialized(true);
      
      return true;
    } catch (error) {
      console.error('[useOptimizedTyping] セッション初期化エラー:', error);
      return false;
    }
  }, [resetStats]);

  /**
   * タイピング入力処理 - 超高速処理版
   */
  const handleInput = useCallback((key) => {
    // 入力キー記録
    setLastPressedKey(key);
    
    // セッションチェック (速度最適化)
    const session = sessionRef.current;
    if (!session || completedRef.current) {
      return { success: false };
    }
    
    try {
      // 入力処理 - 直接処理で高速化
      const result = session.processInput(key);
      
      if (result.success) {
        // 正解の場合
        if (playSound) {
          soundSystem.playSound('success');
        }
        
        // 正解カウント
        countCorrectKey(Date.now());
        
        // 表示情報更新
        const colorInfo = session.getColoringInfo();
        const newDisplayData = {
          romaji: colorInfo.romaji || '',
          typedLength: colorInfo.typedLength || 0,
          currentInputLength: colorInfo.currentInputLength || 0,
          currentCharIndex: colorInfo.currentCharIndex || 0,
          currentInput: colorInfo.currentInput || '',
          expectedNextChar: colorInfo.expectedNextChar || '',
          currentCharRomaji: colorInfo.currentCharRomaji || '',
        };
        
        setDisplayData(newDisplayData);
        
        // 進捗更新 (変化が大きい場合のみ更新)
        const newProgress = session.getCompletionPercentage();
        if (Math.abs(newProgress - progressPercentage) >= PROGRESS_UPDATE_THRESHOLD) {
          setProgressPercentage(newProgress);
        }
        
        // デバッグ情報の更新
        if (onDebugInfoUpdate) {
          debugInfoRef.current = {
            ...debugInfoRef.current,
            lastKey: key,
            displayInfo: newDisplayData,
            progress: newProgress,
          };
          onDebugInfoUpdate(debugInfoRef.current);
        }
        
        // 完了チェック - 即時処理
        if (result.status === 'all_completed') {
          handleProblemComplete();
        }
        
        return { success: true };
      } else {
        // 不正解の場合
        if (playSound) {
          soundSystem.playSound('error');
        }
        
        // エラーアニメーション
        showErrorAnimation();
        
        // ミスカウント
        countMistake();
        
        // デバッグ情報更新
        if (onDebugInfoUpdate) {
          const expectedKey = session.getCurrentExpectedKey() || '';
          debugInfoRef.current = {
            ...debugInfoRef.current,
            lastErrorKey: key,
            expectedKey,
            mistakeCount: statsRef.current.mistakeCount
          };
          onDebugInfoUpdate(debugInfoRef.current);
        }
        
        return { success: false };
      }
    } catch (error) {
      console.error('[useOptimizedTyping] 入力処理エラー:', error);
      return { success: false, error };
    }
  }, [
    completedRef,
    countCorrectKey,
    countMistake,
    handleProblemComplete,
    onDebugInfoUpdate,
    playSound,
    progressPercentage,
    showErrorAnimation,
    soundSystem
  ]);

  /**
   * 次に入力すべきキーを取得 (メモ化による最適化)
   */
  const getNextKey = useCallback(() => {
    return sessionRef.current?.getCurrentExpectedKey() || '';
  }, []);

  /**
   * 問題設定
   */
  const setProblem = useCallback((problem) => {
    return initializeSession(problem);
  }, [initializeSession]);

  /**
   * 初期問題の設定
   */
  useEffect(() => {
    if (initialProblem) {
      initializeSession(initialProblem);
    }
  }, [initialProblem, initializeSession]);

  /**
   * クリーンアップ処理
   */
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
      if (statsUpdateTimerRef.current) {
        clearTimeout(statsUpdateTimerRef.current);
      }
    };
  }, []);

  /**
   * パフォーマンス計測メトリクス
   */
  const performanceMetrics = useMemo(() => ({
    get inputLatency() {
      return debugInfoRef.current.inputLatency;
    },
    set inputLatency(value) {
      debugInfoRef.current.inputLatency = value;
      if (onDebugInfoUpdate) {
        onDebugInfoUpdate(debugInfoRef.current);
      }
    }
  }), [onDebugInfoUpdate]);

  // 公開API (オブジェクト生成最小化)
  return {
    // 状態
    isInitialized,
    isCompleted,
    displayInfo: displayData,
    displayStats,
    progressPercentage,
    errorAnimation,
    lastPressedKey,
    
    // セッション参照
    typingSession: sessionRef.current,
    typingSessionRef: sessionRef,
    
    // 統計情報
    typingStats: {
      statsRef,
      displayStats,
      resetStats,
      updateDisplayStats,
    },
    statsRef,
    
    // メソッド
    handleInput,
    setProblem,
    getNextKey,
    resetStats,
    updateDisplayStats,
    
    // パフォーマンスメトリクス
    performanceMetrics
  };
}