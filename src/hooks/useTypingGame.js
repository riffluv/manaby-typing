import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TypingUtils from '../utils/TypingUtils';
import soundSystem from '../utils/SoundUtils';
import typingWorkerManager from '../utils/TypingWorkerManager';

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
  // タイピングセッションを参照として保持（再レンダリング抑制のため）
  const sessionRef = useRef(null);

  // 必要最低限のステートだけを管理（再レンダリングの最小化）
  const [displayRomaji, setDisplayRomaji] = useState('');
  const [coloringInfo, setColoringInfo] = useState({
    typedLength: 0,
    currentInputLength: 0,
  });
  const [statistics, setStatistics] = useState({
    correctKeyCount: 0,
    mistakeCount: 0,
    startTime: null,
    currentProblemStartTime: null,
    problemStats: [],
  });
  const [errorAnimation, setErrorAnimation] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // エラーカウントはステートではなくrefで管理（頻繁に更新されるため）
  const errorCountRef = useRef(0);

  // アニメーション用タイマー
  const errorAnimationTimerRef = useRef(null);

  // 問題完了時の処理
  const completeProblem = useCallback(() => {
    // すでに完了済みなら何もしない
    if (isCompleted) return;

    // 完了フラグを設定
    setIsCompleted(true);

    // 問題ごとの統計情報を計算
    const now = Date.now();
    const problemElapsedMs = statistics.currentProblemStartTime
      ? now - statistics.currentProblemStartTime
      : 0;
    const problemKeyCount = statistics.currentProblemKeyCount || 0;

    // 問題の詳細データを作成
    const problemData = {
      problemKeyCount,
      problemElapsedMs,
      problemKPM: TypingUtils.calculateWeatherTypingKPM(problemKeyCount, problemElapsedMs, [])
    };

    // 全ての問題の統計情報
    const updatedProblemStats = [...statistics.problemStats, problemData];

    // 統計情報を一度だけ更新（複数の更新をまとめる）
    setStatistics(prev => ({
      ...prev,
      problemStats: updatedProblemStats,
    }));

    // コールバック呼び出し
    onProblemComplete({
      problemKeyCount,
      problemElapsedMs,
      problemKPM: problemData.problemKPM,
      problemStats: updatedProblemStats
    });
  }, [isCompleted, statistics, onProblemComplete]);

  // タイピング入力処理 - 効率的なタイピング処理パス
  const handleInput = useCallback((key) => {
    // セッションがない、または完了済みなら何もしない
    const session = sessionRef.current;
    if (!session || isCompleted) {
      return { success: false, status: 'inactive_session' };
    }

    // 現在の時刻を記録
    const now = Date.now();

    // 初回入力時は開始時間を記録
    if (!statistics.startTime) {
      setStatistics(prev => ({
        ...prev,
        startTime: now,
        currentProblemStartTime: now,
      }));
    }

    // 入力文字を半角に変換
    const halfWidthChar = TypingUtils.convertFullWidthToHalfWidth(key.toLowerCase());

    // 入力処理（パフォーマンス最適化のため直接セッションを操作）
    const result = session.processInput(halfWidthChar);

    // 入力結果によって処理を分岐
    if (result.success) {
      // 正解時の処理

      // 効果音再生
      if (playSound) {
        soundSystem.playSound('success');
      }

      // 表示に必要な情報だけを更新（最小限のステート更新）
      setColoringInfo(session.getColoringInfo());

      // 統計情報の更新（バッチ更新のため複数の値をまとめて）
      setStatistics(prev => ({
        ...prev,
        correctKeyCount: prev.correctKeyCount + 1,
        currentProblemKeyCount: (prev.currentProblemKeyCount || 0) + 1
      }));

      // 完了チェック
      if (result.status === 'all_completed') {
        completeProblem();
      }

      return { success: true, status: result.status };
    } else {
      // 不正解時の処理

      // 効果音再生
      if (playSound) {
        soundSystem.playSound('error');
      }

      // エラーカウントはrefで管理（ステート更新を減らす）
      errorCountRef.current++;

      // エラーアニメーション表示
      setErrorAnimation(true);

      // 既存のタイマーをクリア
      if (errorAnimationTimerRef.current) {
        clearTimeout(errorAnimationTimerRef.current);
      }

      // アニメーション終了タイマーを設定
      errorAnimationTimerRef.current = setTimeout(() => {
        setErrorAnimation(false);
        errorAnimationTimerRef.current = null;
      }, 200);

      // 統計情報の更新
      setStatistics(prev => ({
        ...prev,
        mistakeCount: prev.mistakeCount + 1
      }));

      return { success: false, status: result.status };
    }
  }, [isCompleted, statistics, playSound, completeProblem]);

  // セッション初期化処理
  const initializeSession = useCallback((problem) => {
    if (!problem) return;

    try {
      // 新しいタイピングセッションを作成
      const session = TypingUtils.createTypingSession(problem);
      if (!session) return;

      // セッションをrefに保存
      sessionRef.current = session;

      // 表示に必要な情報だけを更新
      setDisplayRomaji(session.displayRomaji);
      setColoringInfo(session.getColoringInfo());
      setIsCompleted(false);

      // エラーカウントをリセット
      errorCountRef.current = 0;

      // 統計情報もリセット（ステートをまとめて更新）
      setStatistics({
        correctKeyCount: 0,
        mistakeCount: 0,
        startTime: null,
        currentProblemStartTime: null,
        currentProblemKeyCount: 0,
        problemStats: []
      });

      // ワーカーも初期化
      typingWorkerManager.clearInputHistory();
    } catch (error) {
      console.error('タイピングセッションの初期化に失敗:', error);
    }
  }, []);

  // 初期問題の設定
  useEffect(() => {
    if (initialProblem) {
      initializeSession(initialProblem);
    }
  }, [initialProblem, initializeSession]);

  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (errorAnimationTimerRef.current) {
        clearTimeout(errorAnimationTimerRef.current);
      }
    };
  }, []);

  // 進捗率の計算（メモ化してパフォーマンス向上）
  const progressPercentage = useMemo(() => {
    const session = sessionRef.current;
    if (!session) return 0;

    if (isCompleted) return 100;

    // タイピングセッションの進捗率計算関数を使用
    return session.getCompletionPercentage();
  }, [isCompleted]);

  // 統計情報の計算（メモ化してパフォーマンス向上）
  const stats = useMemo(() => {
    const correctCount = statistics.correctKeyCount;
    const missCount = statistics.mistakeCount;
    const totalCount = correctCount + missCount;
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    const startTime = statistics.startTime || Date.now();
    const elapsedTimeMs = Date.now() - startTime;
    const elapsedTimeSeconds = elapsedTimeMs / 1000;

    // KPM計算
    const kpm = TypingUtils.calculateWeatherTypingKPM(
      correctCount,
      elapsedTimeMs,
      statistics.problemStats
    );

    // ランク計算
    const rank = TypingUtils.getRank(kpm);

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
      problemStats: statistics.problemStats
    };
  }, [statistics]);

  // ランキング登録関数
  const submitScore = useCallback((username = 'Anonymous', endpoint) => {
    if (!stats || !stats.kpm) {
      return Promise.reject(new Error('有効なスコアデータがありません'));
    }

    const recordData = {
      username,
      score: stats.correctCount || 0,
      kpm: stats.kpm || 0,
      accuracy: stats.accuracy || 0,
      problemCount: statistics.problemStats ? statistics.problemStats.length : 0,
      endpoint
    };

    return typingWorkerManager.submitRanking(recordData);
  }, [stats, statistics]);

  // 返り値をメモ化して不要な再レンダリングを防止
  return useMemo(() => ({
    // 状態
    typingSession: sessionRef.current,
    displayRomaji,
    errorCount: errorCountRef.current,
    errorAnimation,
    coloringInfo,
    isCompleted,
    stats,
    progressPercentage,

    // 現在の期待入力キー取得（キーボード表示用）
    getCurrentExpectedKey: () => sessionRef.current?.getCurrentExpectedKey(),

    // 次の入力可能文字セットを取得（最適化用）
    getNextPossibleChars: () => sessionRef.current?.getNextPossibleChars(),

    // メソッド
    initializeSession,
    handleInput,
    completeProblem,
    submitScore,
  }), [
    displayRomaji,
    errorAnimation,
    coloringInfo,
    isCompleted,
    stats,
    progressPercentage,
    initializeSession,
    handleInput,
    completeProblem,
    submitScore
  ]);
}
