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
 * @param {number} options.throttleMs 入力処理の節流時間（ミリ秒）
 * @returns {Object} タイピングゲームの状態と操作メソッド
 */
export function useTypingGame({
  initialProblem = null,
  playSound = true,
  onProblemComplete = () => {},
  throttleMs = 16, // 約60FPSに相当（デフォルト値）
} = {}) {
  // パフォーマンスのためにレンダリングカウントを追跡（開発用）
  const renderCount = useRef(0);

  // 初回レンダリング時だけコンソールに表示
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      renderCount.current += 1;
      console.debug(
        `[useTypingGame] レンダリングカウント: ${renderCount.current}`
      );
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

  // キー入力バッファリングと節流のための参照
  const keyBufferRef = useRef([]);
  const lastProcessTimeRef = useRef(0);
  const isProcessingRef = useRef(false);
  const frameIdRef = useRef(null);

  // エラーアニメーション用のタイマーIDを保持
  const errorAnimationTimerRef = useRef(null);

  // クリーンアップ関数
  useEffect(() => {
    return () => {
      // コンポーネントのアンマウント時にタイマーをクリア
      if (errorAnimationTimerRef.current) {
        clearTimeout(errorAnimationTimerRef.current);
      }
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
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

      // 入力バッファをクリア
      keyBufferRef.current = [];

      // 問題ごとの統計情報をリセット
      setStatistics((prev) => ({
        ...prev,
        currentProblemStartTime: null,
        currentProblemKeyCount: 0,
      }));

      if (process.env.NODE_ENV === 'development') {
        console.debug('[useTypingGame] セッション初期化:', {
          displayRomaji: session.displayRomaji,
          problemText: problem.displayText,
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

  // 問題完了時の処理 - useCallbackでメモ化
  // ※この関数を先に宣言して循環参照を解決
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
    setStatistics((prev) => ({
      ...prev,
      problemKPMs: updatedProblemKPMs,
    }));

    if (process.env.NODE_ENV === 'development') {
      console.debug('[useTypingGame] 問題完了:', {
        problemKPM,
        problemElapsedMs,
        problemKeyCount,
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

  // バッファされたキー入力を処理する関数
  const processKeyBuffer = useCallback(() => {
    if (isProcessingRef.current || !typingSession || isCompleted) {
      return;
    }

    // 処理中フラグを立てる
    isProcessingRef.current = true;

    try {
      const now = Date.now();
      
      // 高速化のため、バッファが空になるまで連続処理を行う
      // これによりフレーム間の無駄な待ち時間を削減
      let processedCount = 0;
      const maxBatchSize = 5; // 1回のフレームで処理する最大キー数（調整可能）

      while (keyBufferRef.current.length > 0 && processedCount < maxBatchSize) {
        const timeSinceLastProcess = now - lastProcessTimeRef.current;
        
        // 連続入力時のみスロットリングを緩和（反応性向上）
        const dynamicThrottle = keyBufferRef.current.length > 2 ? 
          Math.max(4, throttleMs / 2) : // バッファ内に複数のキーがある場合は処理間隔を短縮
          throttleMs; // 通常のスロットリング間隔
          
        // 必要に応じて節流処理
        if (timeSinceLastProcess < dynamicThrottle && processedCount > 0) {
          break; // 最初のキーは処理済みで、次のキーはスロットリングが必要な場合
        }

        // 現在のバッファからキーを取り出す（FIFO）
        const key = keyBufferRef.current.shift();
        lastProcessTimeRef.current = now;
        processedCount++;

        // 最初のキー入力時にタイマー計測を開始
        if (!statistics.startTime) {
          setStatistics((prev) => ({
            ...prev,
            startTime: now,
            currentProblemStartTime: now,
          }));
        }
        // 現在の問題の開始時間がまだ設定されていない場合
        else if (!statistics.currentProblemStartTime) {
          setStatistics((prev) => ({
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
          setStatistics((prev) => ({
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
            break; // 問題完了時は処理を停止
          }
        } else {
          // 誤入力の処理
          setErrorCount((prev) => prev + 1);
          setErrorAnimation(true);

          // 統計情報に誤入力を記録
          setStatistics((prev) => ({
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
      }

      // バッファにまだ入力が残っている場合は次のフレームで処理を続行
      if (keyBufferRef.current.length > 0) {
        frameIdRef.current = requestAnimationFrame(processKeyBuffer);
      }
    } finally {
      // 処理中フラグを解除
      isProcessingRef.current = false;
    }
  }, [
    typingSession,
    isCompleted,
    statistics,
    playSound,
    throttleMs,
    completeProblem,
  ]);

  // 入力をバッファに追加するだけの高速な関数 - 先読み最適化版
  const handleInput = useCallback(
    (key) => {
      if (!typingSession || isCompleted) {
        return { success: false, status: 'inactive_session' };
      }

      // キーバッファに入力を追加（FIFO）
      keyBufferRef.current.push(key);

      // 先読み最適化: 次の入力を予測して、処理の準備を始める
      if (typingSession.currentCharIndex < typingSession.patterns.length) {
        // 現在の入力状況
        const charIndex = typingSession.currentCharIndex;
        const nextCharIndex = charIndex + 1;
        
        // 現在の文字が完了したかどうかを予測
        const currentInput = typingSession.currentInput + key;
        
        // 現在のパターンに完全一致するか確認
        const patterns = typingSession.patterns[charIndex];
        const exactMatch = patterns.find(pattern => pattern === currentInput);
        
        // 次の文字の入力準備
        if (exactMatch && nextCharIndex < typingSession.patterns.length) {
          // 次の文字のパターンを事前に探索して、レンダリングの準備をしておく
          // 状態は更新せず、単に計算のみ実行
          const nextPossibleChars = TypingUtils.getNextPossibleChars(nextCharIndex);
          
          if (nextPossibleChars) {
            // 次の入力の可能性を計算済み（これにより次のレンダリング時間が短縮される）
            console.log('[最適化] 次の入力を先読み準備完了:', 
              Array.from(nextPossibleChars).join(','));
          }
        }
      }
      
      // バッファ処理をリクエスト（まだ処理中でなければ）
      if (!isProcessingRef.current) {
        frameIdRef.current = requestAnimationFrame(processKeyBuffer);
      }

      return { success: true, status: 'buffered' };
    },
    [typingSession, isCompleted, processKeyBuffer]
  );

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

  // キーバッファの長さを提供（監視用）
  const bufferLength = useMemo(
    () => keyBufferRef.current.length,
    [keyBufferRef.current.length]
  );

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
    const kpm =
      elapsedTimeMs > 0
        ? TypingUtils.calculateWeatherTypingKPM
          ? TypingUtils.calculateWeatherTypingKPM(correctCount, elapsedTimeMs)
          : Math.floor((correctCount / elapsedTimeMs) * 60000)
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
      bufferLength, // 現在のキーバッファ長（デバッグ用）

      // メソッド
      initializeSession,
      handleInput,
      completeProblem,
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
      bufferLength,
      initializeSession,
      handleInput,
      completeProblem,
    ]
  );
}
