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
    problemStats: [] // 明示的に空の配列として初期化
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

    // 問題の詳細データを作成（KPM計算関数に渡すためのフォーマット）
    const problemData = {
      problemKeyCount,
      problemElapsedMs,
      problemKPM
    };

    // 新しい問題データを配列に追加
    const updatedProblemStats = [...(statistics.problemStats || []), problemData];

    // 統計情報を更新
    setStatistics((prev) => ({
      ...prev,
      problemKPMs: [...(prev.problemKPMs || []), problemKPM],
      problemStats: updatedProblemStats // WeTyping公式計算のための詳細データ
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
      updatedProblemStats,
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
      let needsColorUpdate = false;
      let processedCount = 0;
      const maxBatchSize = 10; // バッチサイズを増加（高速タイピング対応）

      // 統計情報の更新に使用するカウンター（バッチ処理用）
      let correctKeyIncrement = 0;
      let problemKeyIncrement = 0;
      let mistakeIncrement = 0;

      // 高速化: バッファが空になるまで一気に処理
      while (keyBufferRef.current.length > 0 && processedCount < maxBatchSize) {
        // 動的スロットリングはさらに緩和（反応性を最優先）
        const dynamicThrottle = 
          keyBufferRef.current.length > 3 ? 2 : // 複数キー入力時は超高速処理
          keyBufferRef.current.length > 0 ? 4 : // 少数キー入力時も高速処理
          throttleMs; // 通常のスロットリング

        const timeSinceLastProcess = now - lastProcessTimeRef.current;
        if (timeSinceLastProcess < dynamicThrottle && processedCount > 0) {
          break;
        }

        const key = keyBufferRef.current.shift();
        lastProcessTimeRef.current = now;
        processedCount++;

        // 最初のキー入力時のタイマー設定（これは必要なので残す）
        if (!statistics.startTime) {
          setStatistics((prev) => ({
            ...prev,
            startTime: now,
            currentProblemStartTime: now,
          }));
        }
        else if (!statistics.currentProblemStartTime) {
          setStatistics((prev) => ({
            ...prev,
            currentProblemStartTime: now,
          }));
        }

        // 入力処理
        const halfWidthChar = TypingUtils.convertFullWidthToHalfWidth(key);
        const result = typingSession.processInput(halfWidthChar);

        if (result.success) {
          // 色分け情報の更新フラグを立てる（バッチ処理後にまとめて更新）
          needsColorUpdate = true;
          
          // キーカウントを増加（統計情報の一括更新用）
          correctKeyIncrement++;
          problemKeyIncrement++;
          
          // 効果音は維持（体感速度に影響するため）
          if (playSound) {
            soundSystem.play('success');
          }

          // 完了判定は即時処理（これは遅延できない）
          if (result.status === 'all_completed') {
            // 更新済みの統計をまとめて保存
            if (correctKeyIncrement > 0 || mistakeIncrement > 0) {
              setStatistics((prev) => ({
                ...prev,
                correctKeyCount: prev.correctKeyCount + correctKeyIncrement,
                currentProblemKeyCount: prev.currentProblemKeyCount + problemKeyIncrement,
                mistakeCount: prev.mistakeCount + mistakeIncrement,
              }));
            }
            
            completeProblem();
            break;
          }
        } else {
          // エラー処理
          mistakeIncrement++;
          
          // エラーアニメーションは視覚的フィードバックなので即時更新
          setErrorAnimation(true);
          setErrorCount((prev) => prev + 1);

          // エラー音再生
          if (playSound) {
            soundSystem.play('error');
          }

          // エラーアニメーションリセット
          if (errorAnimationTimerRef.current) {
            clearTimeout(errorAnimationTimerRef.current);
          }

          errorAnimationTimerRef.current = setTimeout(() => {
            setErrorAnimation(false);
            errorAnimationTimerRef.current = null;
          }, 200);
        }
      }

      // 処理完了後にまとめて更新（状態更新の回数を最小化）
      if (needsColorUpdate) {
        setColoringInfo(typingSession.getColoringInfo());
      }

      // 統計情報もまとめて更新
      if (correctKeyIncrement > 0 || mistakeIncrement > 0) {
        setStatistics((prev) => ({
          ...prev,
          correctKeyCount: prev.correctKeyCount + correctKeyIncrement,
          currentProblemKeyCount: prev.currentProblemKeyCount + problemKeyIncrement,
          mistakeCount: prev.mistakeCount + mistakeIncrement,
        }));
      }

      // まだ入力が残っている場合は次フレームで処理
      if (keyBufferRef.current.length > 0) {
        frameIdRef.current = requestAnimationFrame(processKeyBuffer);
      }
    } finally {
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

      // パフォーマンスのため静的フラグでログ出力を制御
      const enableDebugLogs = false; // 有効にすると詳細なログを出力

      // 先読み最適化: 次の入力を予測して、処理の準備を始める
      if (typingSession.currentCharIndex < typingSession.patterns.length) {
        // 現在の入力状況
        const charIndex = typingSession.currentCharIndex;
        const nextCharIndex = charIndex + 1;

        // 現在の文字が完了したかどうかを予測
        const currentInput = typingSession.currentInput + key;

        // 現在のパターンに完全一致するか確認
        const patterns = typingSession.patterns[charIndex];
        const exactMatch = patterns.find((pattern) => pattern === currentInput);

        // 次の文字の入力準備
        if (exactMatch && nextCharIndex < typingSession.patterns.length) {
          // 次の文字のパターンを事前に探索して、レンダリングの準備をしておく
          // 状態は更新せず、単に計算のみ実行
          TypingUtils.getNextPossibleChars(nextCharIndex);
          // ログをオプションにして通常は出力しない
          if (enableDebugLogs) {
            const nextPossibleChars = TypingUtils.getNextPossibleChars(nextCharIndex);
            if (nextPossibleChars) {
              console.log(
                '[最適化] 次の入力を先読み準備完了:',
                Array.from(nextPossibleChars).join(',')
              );
            }
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
  const lastStatsCalcTimeRef = useRef(0);
  const lastStatsRef = useRef(null);
  const stats = useMemo(() => {
    // パフォーマンス最適化: 統計情報の計算を遅延実行
    // レンダリングやキー入力には関係ない部分のため、計算頻度を減らす
    const now = Date.now();
    const timeElapsedSinceLastCalc = now - (lastStatsCalcTimeRef.current || 0);
    
    // 計算間隔を制限（100ms以内の再計算をスキップ）
    // タイピング中は統計情報を頻繁に更新する必要はない
    if (timeElapsedSinceLastCalc < 100 && lastStatsRef.current && !isCompleted) {
      return lastStatsRef.current;
    }
    
    // 実際に再計算が必要なときのみ計算を実行
    lastStatsCalcTimeRef.current = now;
    
    const correctCount = statistics.correctKeyCount;
    const missCount = statistics.mistakeCount;
    const totalCount = correctCount + missCount;
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

    const startTime = statistics.startTime || now;
    const elapsedTimeMs = now - startTime;
    const elapsedTimeSeconds = elapsedTimeMs / 1000;

    // KPM計算の頻度も制限（プレイ中はリアルタイム性より処理速度優先）
    const kpm = TypingUtils.calculateWeatherTypingKPM(
      correctCount,
      elapsedTimeMs,
      statistics.problemStats
    );

    const rank = TypingUtils.getKPMRank ? TypingUtils.getKPMRank(kpm) : '';
    
    // 新しい統計情報をキャッシュ
    const newStats = {
      correctCount,
      missCount,
      totalCount,
      accuracy: parseFloat(accuracy.toFixed(2)),
      elapsedTimeMs,
      elapsedTimeSeconds: parseFloat(elapsedTimeSeconds.toFixed(1)),
      kpm,
      rank,
      problemKPMs: statistics.problemKPMs,
      problemStats: statistics.problemStats,
    };
    
    // レンダリングがすぐ必要ないデータはキャッシュに保存
    lastStatsRef.current = newStats;
    
    return newStats;
  }, [statistics, isCompleted]);

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
