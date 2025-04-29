import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TypingUtils from '../utils/TypingUtils';
import soundSystem from '../utils/SoundUtils';

/**
 * タイピングゲームのコアロジックを扱うカスタムフック
 * Weather Typing風の実装を踏襲し、UIロジックとビジネスロジックを分離
 * パフォーマンスを最適化するためにコールバックとメモ化を積極的に活用
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
  onProblemComplete = () => {},
} = {}) {
  // パフォーマンスのためにレンダリングカウントを追跡（開発用）
  const renderCount = useRef(0);
  
  // 初回レンダリング時だけコンソールに表示
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      renderCount.current += 1;
      console.debug(`[useTypingGame] レンダリングカウント: ${renderCount.current}`);
    }
  });

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
  });
  const [isCompleted, setIsCompleted] = useState(false);

  // エラーアニメーション用のタイマーIDを保持
  const errorAnimationTimerRef = useRef(null);

  // クリーンアップ関数
  useEffect(() => {
    return () => {
      // コンポーネントのアンマウント時にタイマーをクリア
      if (errorAnimationTimerRef.current) {
        clearTimeout(errorAnimationTimerRef.current);
      }
    };
  }, []);

  // セッションの初期化 - useCallbackでメモ化
  const initializeSession = useCallback((problem) => {
    if (!problem) return;
    
    const session = TypingUtils.createTypingSession(problem);
    if (session) {
      setTypingSession(session);
      setDisplayRomaji(session.displayRomaji);
      setColoringInfo(session.getColoringInfo());
      setErrorCount(0);
      setIsCompleted(false);
      
      // 問題ごとの統計情報をリセット
      setStatistics(prev => ({
        ...prev,
        currentProblemStartTime: null,
        currentProblemKeyCount: 0,
      }));

      if (process.env.NODE_ENV === 'development') {
        console.debug('[useTypingGame] セッション初期化:', { 
          displayRomaji: session.displayRomaji, 
          problemText: problem.displayText 
        });
      }
    }
  }, []);

  // 初期問題がある場合はセッションを初期化
  useEffect(() => {
    if (initialProblem) {
      initializeSession(initialProblem);
    }
  }, [initialProblem, initializeSession]);

  // 入力処理 - useCallbackでメモ化して不要な再生成を防止
  const handleInput = useCallback((key) => {
    if (!typingSession || isCompleted) {
      return { success: false, status: 'inactive_session' };
    }

    // 最初のキー入力時にタイマー計測を開始
    if (!statistics.startTime) {
      const now = Date.now();
      setStatistics(prev => ({
        ...prev,
        startTime: now,
        currentProblemStartTime: now,
      }));
    }
    // 現在の問題の開始時間がまだ設定されていない場合
    else if (!statistics.currentProblemStartTime) {
      const now = Date.now();
      setStatistics(prev => ({
        ...prev,
        currentProblemStartTime: now,
      }));
    }

    // 全角文字を半角に変換
    const halfWidthChar = TypingUtils.convertFullWidthToHalfWidth(key);
    
    // 入力処理
    const result = typingSession.processInput(halfWidthChar);

    if (result.success) {
      // 色分け情報を更新
      setColoringInfo(typingSession.getColoringInfo());
      
      // 正確なキー打鍵数をカウント
      setStatistics(prev => ({
        ...prev,
        correctKeyCount: prev.correctKeyCount + 1,
        currentProblemKeyCount: prev.currentProblemKeyCount + 1,
      }));

      // タイプ成功音を再生
      if (playSound) {
        soundSystem.play('success');
      }

      // すべて入力完了した場合
      if (result.status === 'all_completed') {
        completeProblem();
      }
    } else {
      // 誤入力の処理
      setErrorCount(prev => prev + 1);
      setErrorAnimation(true);
      
      // 統計情報に誤入力を記録
      setStatistics(prev => ({
        ...prev,
        mistakeCount: prev.mistakeCount + 1,
      }));

      // エラー音を再生
      if (playSound) {
        soundSystem.play('error');
      }

      // 既存のタイマーがあればクリア
      if (errorAnimationTimerRef.current) {
        clearTimeout(errorAnimationTimerRef.current);
      }
      
      // エラーアニメーションをリセット - refを使用してタイマーIDを保存
      errorAnimationTimerRef.current = setTimeout(() => {
        setErrorAnimation(false);
        errorAnimationTimerRef.current = null;
      }, 200);
    }

    return result;
  }, [typingSession, isCompleted, statistics, playSound]);

  // 問題完了時の処理 - useCallbackでメモ化
  const completeProblem = useCallback(() => {
    if (isCompleted) return; // 既に完了している場合は処理しない（重複防止）
    
    setIsCompleted(true);
    
    // 問題ごとのKPMを計算
    const now = Date.now();
    const problemElapsedMs = statistics.currentProblemStartTime
      ? now - statistics.currentProblemStartTime
      : 0;
    const problemKeyCount = statistics.currentProblemKeyCount || 0;

    // KPM計算（キー数 ÷ 分）
    let problemKPM = 0;
    if (problemElapsedMs > 0 && problemKeyCount > 0) {
      const minutes = problemElapsedMs / 60000; // ミリ秒を分に変換
      problemKPM = Math.floor(problemKeyCount / minutes); // Weather Typing風に小数点以下切り捨て
    }

    // 新しいKPM値を配列に追加
    const updatedProblemKPMs = [...(statistics.problemKPMs || []), problemKPM];
    
    // 統計情報を更新
    setStatistics(prev => ({
      ...prev,
      problemKPMs: updatedProblemKPMs,
    }));
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[useTypingGame] 問題完了:', { 
        problemKPM, 
        problemElapsedMs, 
        problemKeyCount
      });
    }
    
    // コールバックを呼び出し
    onProblemComplete({
      problemKPM,
      problemElapsedMs,
      problemKeyCount,
      updatedProblemKPMs,
    });
  }, [statistics, onProblemComplete, isCompleted]);

  // 現在の進捗率を計算 - useMemoで最適化
  const progressPercentage = useMemo(() => {
    if (!typingSession || !displayRomaji) return 0;
    
    if (isCompleted) {
      return 100;
    }

    const typedLength = coloringInfo.typedLength || 0;
    const totalLength = displayRomaji.length;
    
    // 進捗率（0～100）
    return totalLength > 0 ? Math.floor((typedLength / totalLength) * 100) : 0;
  }, [typingSession, displayRomaji, coloringInfo, isCompleted]);

  // 統計情報の計算 - useMemoで最適化
  const stats = useMemo(() => {
    const correctCount = statistics.correctKeyCount;
    const missCount = statistics.mistakeCount;
    const totalCount = correctCount + missCount;
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    
    const startTime = statistics.startTime || Date.now();
    const currentTime = Date.now();
    const elapsedTimeMs = currentTime - startTime;
    const elapsedTimeSeconds = elapsedTimeMs / 1000;
    
    // KPM計算に専用関数があればそれを使用
    const kpm = elapsedTimeMs > 0 
      ? (TypingUtils.calculateWeatherTypingKPM 
          ? TypingUtils.calculateWeatherTypingKPM(correctCount, elapsedTimeMs) 
          : Math.floor((correctCount / elapsedTimeMs) * 60000))
      : 0;
      
    const rank = TypingUtils.getKPMRank ? TypingUtils.getKPMRank(kpm) : '';
    
    return {
      correctCount,
      missCount,
      totalCount,
      accuracy: parseFloat(accuracy.toFixed(2)),
      elapsedTimeMs,
      elapsedTimeSeconds: parseFloat(elapsedTimeSeconds.toFixed(1)),
      kpm,
      rank,
      problemKPMs: statistics.problemKPMs,
    };
  }, [statistics]);

  // 返り値をuseMemoでメモ化して子コンポーネントの再レンダリングを最適化
  return useMemo(() => ({
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
  }), [
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
    completeProblem
  ]);
}
