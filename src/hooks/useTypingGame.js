import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TypingUtils from '../utils/TypingUtils';
import soundSystem from '../utils/SoundUtils';
import typingWorkerManager from '../utils/TypingWorkerManager';

// デバッグフラグ設定
const DEBUG_TYPING = false;

/**
 * タイピングゲームのコアロジックを扱うカスタムフック
 * typingmania-refを参考にした高性能実装
 * シンプルで直接的な入力処理パスを実現
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
  // タイピングセッションの状態管理
  const [typingSession, setTypingSession] = useState(null);
  const [displayRomaji, setDisplayRomaji] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const [errorAnimation, setErrorAnimation] = useState(false);
  const [coloringInfo, setColoringInfo] = useState({
    typedLength: 0,
    currentInputLength: 0,
  });
  const [statistics, setStatistics] = useState({
    correctKeyCount: 0,
    mistakeCount: 0,
    startTime: null,
    currentProblemStartTime: null,
    currentProblemKeyCount: 0,
    problemKPMs: [],
    problemStats: [],
  });
  const [isCompleted, setIsCompleted] = useState(false);

  // 入力履歴の管理（統計計算用）
  const inputHistoryRef = useRef([]);
  
  // エラーアニメーション用のタイマーID
  const errorAnimationTimerRef = useRef(null);

  // 問題完了時の処理
  const completeProblem = useCallback(() => {
    if (isCompleted) return;

    setIsCompleted(true);

    // 問題ごとのKPMを計算
    const now = Date.now();
    const problemElapsedMs = statistics.currentProblemStartTime
      ? now - statistics.currentProblemStartTime
      : 0;
    const problemKeyCount = statistics.currentProblemKeyCount || 0;

    // KPM計算
    let problemKPM = 0;
    if (problemElapsedMs > 0 && problemKeyCount > 0) {
      const minutes = problemElapsedMs / 60000;
      problemKPM = Math.floor(problemKeyCount / minutes);
    }

    // 問題の詳細データを作成
    const problemData = {
      problemKeyCount,
      problemElapsedMs,
      problemKPM,
    };

    // 統計情報を更新
    setStatistics((prev) => ({
      ...prev,
      problemKPMs: [...(prev.problemKPMs || []), problemKPM],
      problemStats: [...(prev.problemStats || []), problemData],
    }));

    // コールバックを呼び出し
    onProblemComplete({
      problemKPM,
      problemElapsedMs,
      problemKeyCount,
      problemStats: [...(statistics.problemStats || []), problemData],
    });
  }, [statistics, onProblemComplete, isCompleted]);

  // typingmania-ref風の単純入力処理
  const processInput = useCallback(
    (key) => {
      if (!typingSession || isCompleted) return { success: false };

      // 現在の時間を記録
      const now = Date.now();
      
      // 統計の開始時間設定
      if (!statistics.startTime) {
        setStatistics((prev) => ({
          ...prev,
          startTime: now,
          currentProblemStartTime: now,
        }));
      } else if (!statistics.currentProblemStartTime) {
        setStatistics((prev) => ({
          ...prev,
          currentProblemStartTime: now,
        }));
      }

      // 入力文字を半角に変換
      const halfWidthChar = TypingUtils.convertFullWidthToHalfWidth(key.toLowerCase());
      
      // typingmania-ref風の単純処理パス
      const result = typingSession.processInput(halfWidthChar);

      // 入力結果に応じた処理
      if (result.success) {
        // 効果音再生
        if (playSound) {
          if (soundSystem.context && soundSystem.context.state === 'suspended') {
            soundSystem.context.resume();
          }
          soundSystem.play('success', { immediate: true });
        }

        // 色分け情報を更新
        setColoringInfo(typingSession.getColoringInfo());

        // 統計更新
        setStatistics((prev) => ({
          ...prev,
          correctKeyCount: prev.correctKeyCount + 1,
          currentProblemKeyCount: prev.currentProblemKeyCount + 1,
        }));

        // 入力履歴を記録
        inputHistoryRef.current.push({
          key: halfWidthChar,
          isCorrect: true,
          timestamp: now
        });

        // 完了チェック
        if (result.status === 'all_completed') {
          completeProblem();
        }

        return { success: true, status: result.status };
      } else {
        // エラー処理
        if (playSound) {
          soundSystem.play('error');
        }

        // エラーアニメーション
        setErrorAnimation(true);
        if (errorAnimationTimerRef.current) {
          clearTimeout(errorAnimationTimerRef.current);
        }
        errorAnimationTimerRef.current = setTimeout(() => {
          setErrorAnimation(false);
          errorAnimationTimerRef.current = null;
        }, 200);

        // エラー統計の更新
        setErrorCount((prev) => prev + 1);
        setStatistics((prev) => ({
          ...prev,
          mistakeCount: prev.mistakeCount + 1,
        }));

        // 入力履歴を記録
        inputHistoryRef.current.push({
          key: halfWidthChar,
          isCorrect: false,
          timestamp: now,
          expectedKey: typingSession.getCurrentExpectedKey?.()
        });

        return { success: false, status: result.status };
      }
    },
    [typingSession, statistics, isCompleted, playSound, completeProblem]
  );

  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (errorAnimationTimerRef.current) {
        clearTimeout(errorAnimationTimerRef.current);
      }
      typingWorkerManager.clearInputHistory();
    };
  }, []);

  // セッションの初期化処理
  const initializeSession = useCallback((problem) => {
    if (!problem) return;

    // 新しいタイピングセッション生成
    const session = TypingUtils.createTypingSession(problem);
    if (session) {
      setTypingSession(session);
      setDisplayRomaji(session.displayRomaji);
      setColoringInfo(session.getColoringInfo());
      setErrorCount(0);
      setIsCompleted(false);

      // 履歴・統計のリセット
      inputHistoryRef.current = [];
      typingWorkerManager.clearInputHistory();

      // 問題ごとの統計情報をリセット
      setStatistics((prev) => ({
        ...prev,
        currentProblemStartTime: null,
        currentProblemKeyCount: 0,
      }));

      if (DEBUG_TYPING) {
        console.debug('[useTypingGame] セッション初期化:', {
          displayRomaji: session.displayRomaji,
          problemText: problem.displayText,
        });
      }
    }
  }, []);

  // 初期問題の設定
  useEffect(() => {
    if (initialProblem) {
      initializeSession(initialProblem);
    }
  }, [initialProblem, initializeSession]);

  // 入力処理ハンドラー - シンプル化
  const handleInput = useCallback(
    (key) => {
      if (!typingSession || isCompleted) {
        return { success: false, status: 'inactive_session' };
      }

      // typingmania-ref風の単純直接処理
      return processInput(key);
    },
    [typingSession, isCompleted, processInput]
  );

  // 進捗率の計算
  const progressPercentage = useMemo(() => {
    if (!typingSession || !displayRomaji) return 0;

    if (isCompleted) {
      return 100;
    }

    // typingmania-refと同様の進捗計算
    if (typeof typingSession.getCompletionPercentage === 'function') {
      return typingSession.getCompletionPercentage();
    }

    // フォールバック計算
    const typedLength = coloringInfo.typedLength || 0;
    const totalLength = displayRomaji.length;
    return totalLength > 0 ? Math.floor((typedLength / totalLength) * 100) : 0;
  }, [typingSession, displayRomaji, coloringInfo, isCompleted]);

  // 統計情報の計算
  const stats = useMemo(() => {
    // 基本的な統計情報を計算
    const correctCount = statistics.correctKeyCount;
    const missCount = statistics.mistakeCount;
    const totalCount = correctCount + missCount;
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    const startTime = statistics.startTime || Date.now();
    const elapsedTimeMs = Date.now() - startTime;
    const elapsedTimeSeconds = elapsedTimeMs / 1000;

    // KPM計算
    let kpm = 0;
    if (elapsedTimeMs > 0 && correctCount > 0) {
      const minutes = elapsedTimeMs / 60000;
      kpm = Math.floor(correctCount / minutes);
    }

    // ランク計算
    let rank = 'F';
    if (kpm >= 400) rank = 'S';
    else if (kpm >= 300) rank = 'A';
    else if (kpm >= 200) rank = 'B';
    else if (kpm >= 150) rank = 'C';
    else if (kpm >= 100) rank = 'D';
    else if (kpm >= 50) rank = 'E';

    return {
      correctCount,
      missCount,
      totalCount,
      accuracy: parseFloat(accuracy.toFixed(2)),
      elapsedTimeMs,
      elapsedTimeSeconds: parseFloat(elapsedTimeSeconds.toFixed(1)),
      kpm,
      rank,
      rankColor: TypingUtils.getRankColor(rank),
      problemKPMs: statistics.problemKPMs,
      problemStats: statistics.problemStats,
    };
  }, [statistics]);

  // ランキング登録関数
  const submitScore = useCallback(
    (username = 'Anonymous', endpoint) => {
      if (!stats || !stats.kpm) {
        return Promise.reject(new Error('有効なスコアデータがありません'));
      }

      const recordData = {
        username,
        score: stats.correctCount || 0,
        kpm: stats.kpm || 0,
        accuracy: stats.accuracy || 0,
        problemCount: statistics.problemStats
          ? statistics.problemStats.length
          : 0,
        endpoint,
      };

      return typingWorkerManager.submitRanking(recordData);
    },
    [stats, statistics]
  );

  // 返り値
  return useMemo(
    () => ({
      // 状態
      typingSession,
      displayRomaji,
      errorCount,
      errorAnimation,
      coloringInfo,
      isCompleted,
      stats,
      progressPercentage,

      // メソッド
      initializeSession,
      handleInput,
      completeProblem,
      submitScore,

      // ヘルパー
      getRankColor: TypingUtils.getRankColor,
    }),
    [
      typingSession,
      displayRomaji,
      errorCount,
      errorAnimation,
      coloringInfo,
      isCompleted,
      stats,
      progressPercentage,
      initializeSession,
      handleInput,
      completeProblem,
      submitScore,
    ]
  );
}
