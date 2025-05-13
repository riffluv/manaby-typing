/**
 * useTypingGame.js
 * タイピングゲームの核となるカスタムフック
 * リファクタリング済み（2025年5月8日）- 高速レスポンス最適化版
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TypingUtils from '../utils/TypingUtils';
import soundSystem from '../utils/SoundUtils';
import typingWorkerManager from '../utils/TypingWorkerManager';

/**
 * タイピングゲームのコアロジックを扱うカスタムフック
 * パフォーマンス最適化版
 * 
 * @param {Object} options タイピングゲームの設定オプション
 * @param {Object} options.initialProblem 初期問題
 * @param {boolean} options.playSound 効果音を再生するかどうか
 * @param {Function} options.onProblemComplete 問題完了時のコールバック
 * @returns {Object} タイピングゲームの状態と操作メソッド
 */
export function useTypingGame({
  initialProblem = null,
  playSound = true,
  onProblemComplete = () => { }
} = {}) {
  // タイピングセッション（直接アクセス用）
  const typingSessionRef = useRef(null);

  // 基本表示情報
  const [displayInfo, setDisplayInfo] = useState({
    romaji: '',
    typedLength: 0,
    currentInputLength: 0,
    currentCharIndex: 0,
    currentInput: '',
    expectedNextChar: '',
    currentCharRomaji: '',
  });

  // 統計情報は参照で管理（再レンダリング防止）
  const statsRef = useRef({
    correctKeyCount: 0,
    mistakeCount: 0,
    startTime: null,
    currentProblemStartTime: null,
    problemStats: [],
  });

  // UIのみに必要な統計情報
  const [displayStats, setDisplayStats] = useState({
    correctKeyCount: 0,
    mistakeCount: 0,
    kpm: 0,
    rank: 'F',
  });

  // UI状態フラグ
  const [errorAnimation, setErrorAnimation] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const completedRef = useRef(false);

  // タイマー参照
  const errorTimerRef = useRef(null);
  const statsUpdateTimerRef = useRef(null);

  /**
   * 問題完了時の処理
   * 直接呼び出しのみでスケジューリングはしない
   */
  const completeProblem = useCallback(() => {
    // すでに完了済みなら何もしない
    if (completedRef.current) return;

    // 完了フラグを設定
    completedRef.current = true;

    // 問題ごとの統計情報を計算
    const now = Date.now();
    const stats = statsRef.current;
    const problemElapsedMs = stats.currentProblemStartTime
      ? now - stats.currentProblemStartTime
      : 0;
    const problemKeyCount = stats.correctKeyCount || 0;

    // 問題の詳細データを作成
    const problemData = {
      problemKeyCount,
      problemElapsedMs,
      problemKPM: problemElapsedMs > 0
        ? Math.floor((problemKeyCount / (problemElapsedMs / 60000)))
        : 0,
      timestamp: now,
    };

    // 統計情報を更新
    const updatedProblemStats = [...(stats.problemStats || []), problemData];
    stats.problemStats = updatedProblemStats;

    // 進捗100%に設定
    setProgressPercentage(100);

    // 表示用統計情報を更新
    updateDisplayStats();

    // コールバック呼び出し
    onProblemComplete({
      problemKeyCount,
      problemElapsedMs,
      problemKPM: problemData.problemKPM,
      updatedProblemKPMs: updatedProblemStats.map(p => p.problemKPM || 0),
      problemStats: updatedProblemStats
    });
  }, [onProblemComplete]);

  /**
   * 表示用統計情報を更新
   */
  const updateDisplayStats = useCallback(() => {
    const stats = statsRef.current;
    const correctCount = stats.correctKeyCount;
    const missCount = stats.mistakeCount;

    // 問題データがある場合は平均KPMを計算
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

    // 表示用統計情報の更新
    setDisplayStats({
      correctKeyCount: correctCount,
      mistakeCount: missCount,
      kpm,
      rank,
    });
  }, []);

  /**
   * UI更新を一括処理
   * 重要なパフォーマンス最適化ポイント
   */
  const updateUI = useCallback((updates = {}) => {
    if (updates.displayInfo) {
      setDisplayInfo(updates.displayInfo);
    }

    if (updates.progress !== undefined) {
      setProgressPercentage(updates.progress);
    }

    if (updates.error) {
      // エラーアニメーション表示
      setErrorAnimation(true);

      // エラーアニメーションのタイマーをリセット
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }

      // タイマーを設定してエラーアニメーションを消す
      errorTimerRef.current = setTimeout(() => {
        setErrorAnimation(false);
        errorTimerRef.current = null;
      }, 150); // 高速応答のため短縮
    }
  }, []);

  /**
   * タイピング入力処理 - 高速パフォーマンス版
   * 主要な最適化ポイント
   */
  const handleInput = useCallback((key) => {
    // セッションがない場合や完了済みの場合は何もしない
    const session = typingSessionRef.current;
    if (!session || completedRef.current) {
      return false;
    }

    // 入力開始時間を記録
    const now = Date.now();
    const stats = statsRef.current;
    const isFirstInput = !stats.startTime;

    // 入力を処理（直接処理で高速化）
    const result = session.processInput(key);

    // 入力結果によって処理を分岐
    if (result.success) {
      // 正解時の処理
      // 初回入力時のみ開始時間を記録
      if (isFirstInput) {
        stats.startTime = now;
        stats.currentProblemStartTime = now;
      }

      // 効果音再生
      if (playSound) {
        soundSystem.playSound('success');
      }

      // 正解カウントを更新
      stats.correctKeyCount += 1;

      // 進捗表示の更新（大きな変化があるときのみ）
      const newProgress = session.getCompletionPercentage();
      if (Math.abs(newProgress - progressPercentage) >= 5) {
        setProgressPercentage(newProgress);
      }

      // 表示情報の更新
      const colorInfo = session.getColoringInfo();
      updateUI({
        displayInfo: {
          romaji: colorInfo.romaji || '',
          typedLength: colorInfo.typedLength || 0,
          currentInputLength: colorInfo.currentInputLength || 0,
          currentCharIndex: colorInfo.currentCharIndex || 0,
          currentInput: colorInfo.currentInput || '',
          expectedNextChar: colorInfo.expectedNextChar || '',
          currentCharRomaji: colorInfo.currentCharRomaji || '',
        }
      });

      // 統計情報の更新は頻度を下げる（1秒ごと）
      if (!statsUpdateTimerRef.current) {
        statsUpdateTimerRef.current = setTimeout(() => {
          updateDisplayStats();
          statsUpdateTimerRef.current = null;
        }, 250); // 頻度を下げて負荷軽減
      }

      // 完了チェック - 即時処理
      if (result.status === 'all_completed') {
        completeProblem();
      }

      return true;
    } else {
      // 不正解時の処理
      // 効果音再生
      if (playSound) {
        soundSystem.playSound('error');
      }

      // エラーカウントを更新
      stats.mistakeCount += 1;

      // エラーアニメーション表示
      updateUI({ error: true });

      return false;
    }
  }, [playSound, completeProblem, updateUI, updateDisplayStats, progressPercentage]);

  /**
   * セッション初期化処理
   */
  const initializeSession = useCallback((problem) => {
    if (!problem) return;

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

      // 新しいタイピングセッションを作成
      const session = TypingUtils.createTypingSession(problem);
      if (!session) return;

      // セッションを保存
      typingSessionRef.current = session;

      // 表示情報を初期化
      setDisplayInfo({
        romaji: session.displayRomaji || '',
        typedLength: 0,
        currentInputLength: 0,
        currentCharIndex: 0,
        currentInput: '',
        expectedNextChar: session.getCurrentExpectedKey() || '',
        currentCharRomaji: session.patterns[0] ? session.patterns[0][0] : '',
      });

      // 状態をリセット
      completedRef.current = false;
      setErrorAnimation(false);
      setProgressPercentage(0);

      // 統計情報もリセット
      statsRef.current = {
        correctKeyCount: 0,
        mistakeCount: 0,
        startTime: null,
        currentProblemStartTime: null,
        problemStats: [],
      };

      // 表示用統計情報も初期化
      setDisplayStats({
        correctKeyCount: 0,
        mistakeCount: 0,
        kpm: 0,
        rank: 'F',
      });
    } catch (error) {
      console.error('タイピングセッションの初期化に失敗:', error);
    }
  }, []);

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
      // 各種タイマーをクリア
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
      if (statsUpdateTimerRef.current) {
        clearTimeout(statsUpdateTimerRef.current);
      }
    };
  }, []);

  /**
   * 統計情報オブジェクト（メモ化）
   */
  const stats = useMemo(() => {
    const correctCount = displayStats.correctKeyCount;
    const missCount = displayStats.mistakeCount;
    const totalCount = correctCount + missCount;
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

    return {
      correctCount,
      missCount,
      totalCount,
      accuracy: parseFloat(accuracy.toFixed(2)),
      kpm: displayStats.kpm,
      rank: displayStats.rank,
      rankColor: TypingUtils.getRankColor(displayStats.rank),
      problemStats: statsRef.current.problemStats,
      elapsedTimeSeconds: statsRef.current.startTime
        ? (Date.now() - statsRef.current.startTime) / 1000
        : 0
    };
  }, [displayStats]);

  /**
   * ランキング登録関数
   */
  const submitScore = useCallback((username = 'Anonymous', endpoint) => {
    if (!stats || !stats.kpm) {
      return Promise.reject(new Error('有効なスコアデータがありません'));
    }

    const recordData = {
      username,
      score: stats.correctCount || 0,
      kpm: stats.kpm || 0,
      accuracy: stats.accuracy || 0,
      problemCount: statsRef.current.problemStats?.length || 0,
      endpoint,
      timestamp: Date.now()
    };

    return typingWorkerManager.submitRanking(recordData);
  }, [stats]);

  // 公開するインターフェースはそのまま維持（互換性のため）
  return {
    displayInfo,
    displayStats,
    progressPercentage,
    errorAnimation,
    handleInput,
    initializeSession,
    submitScore,
    stats,
    typingSession: typingSessionRef.current, // 直接アクセス用に公開
  };
}
