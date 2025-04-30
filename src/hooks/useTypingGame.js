import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TypingUtils from '../utils/TypingUtils';
import soundSystem from '../utils/SoundUtils';

/**
 * タイピングゲームのコアロジックを扱うカスタムフック
 * typingmania-refを参考にした高性能実装に対応
 * パフォーマンスを最大限に最適化したリアルタイム処理を実現
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

  // 最適化された入力処理システム：typingmania-refスタイル
  // 入力バッファリングを参照オブジェクトとして保持
  const inputSystem = useRef(null);
  
  // キー入力バッファリングと節流のための参照
  const keyBufferRef = useRef([]);
  const lastProcessTimeRef = useRef(0);
  const isProcessingRef = useRef(false);
  const frameIdRef = useRef(null);
  
  // typingmania-ref風のパフォーマンス設定
  const performanceConfig = useRef({
    // 一度に処理する最大文字数
    maxBatchSize: 10,
    // 統計情報の再計算頻度（ミリ秒）
    statsUpdateInterval: 100,
    // キー入力の処理間隔（ミリ秒）- 高負荷時は自動調整
    processingThreshold: throttleMs || 16
  }).current;

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
      // 入力システムもクリーンアップ
      if (inputSystem.current) {
        inputSystem.current.cleanup();
      }
    };
  }, []);

  // 入力処理関数 - 高速化バージョン
  const processInput = useCallback((key, timestamp) => {
    if (!typingSession || isCompleted) return { success: false };

    // 統計の開始時間設定
    const now = timestamp || Date.now();
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
        currentProblemStartTime: now 
      }));
    }

    // タイピングセッションを使用して入力を処理（最適化版）
    const halfWidthChar = TypingUtils.convertFullWidthToHalfWidth(key);
    const result = typingSession.processInput(halfWidthChar);

    if (result.success) {
      // 効果音再生（これは保持）
      if (playSound) {
        soundSystem.play('success');
      }

      // 統計更新（カウンターのみ、バッチ処理向け）
      setStatistics((prev) => ({
        ...prev,
        correctKeyCount: prev.correctKeyCount + 1,
        currentProblemKeyCount: prev.currentProblemKeyCount + 1,
      }));

      // 色分け情報を更新
      setColoringInfo(typingSession.getColoringInfo());

      // 完了チェック
      if (result.status === 'all_completed') {
        completeProblem();
      }

      return { success: true, status: result.status };
    } else {
      // エラー処理
      setErrorCount((prev) => prev + 1);
      setErrorAnimation(true);
      setStatistics((prev) => ({
        ...prev,
        mistakeCount: prev.mistakeCount + 1,
      }));

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

      return { success: false, status: result.status };
    }
  }, [typingSession, statistics, isCompleted, playSound]);

  // 初期化時に入力バッファマネージャーを作成
  useEffect(() => {
    // typingmania-ref風の最適化された入力バッファリングシステムを作成
    inputSystem.current = TypingUtils.createInputBufferManager(
      processInput,
      {
        initialBufferSize: 16,
        maxBatchSize: performanceConfig.maxBatchSize
      }
    );
    
    return () => {
      if (inputSystem.current) {
        inputSystem.current.cleanup();
      }
    };
  }, [processInput, performanceConfig.maxBatchSize]);

  // セッションの初期化 - useCallbackでメモ化
  const initializeSession = useCallback((problem) => {
    if (!problem) return;

    // 新しい最適化タイピングセッションを生成
    const session = TypingUtils.createTypingSession(problem);
    if (session) {
      setTypingSession(session);
      setDisplayRomaji(session.displayRomaji);
      setColoringInfo(session.getColoringInfo());
      setErrorCount(0);
      setIsCompleted(false);

      // 入力バッファをクリア
      keyBufferRef.current = [];
      
      // 入力システムもリセット
      if (inputSystem.current) {
        inputSystem.current.cleanup();
      }

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

  // 入力をバッファに追加するだけの高速な関数 - typingmania風の最適化版
  const handleInput = useCallback(
    (key) => {
      if (!typingSession || isCompleted) {
        return { success: false, status: 'inactive_session' };
      }

      // 最適化された入力システムを使用（高速バッファリング）
      if (inputSystem.current) {
        inputSystem.current.addInput(key);
        return { success: true, status: 'buffered' };
      }

      // フォールバック：キーバッファに入力を追加（FIFO）
      keyBufferRef.current.push(key);

      // バッファ処理をリクエスト（まだ処理中でなければ）
      if (!isProcessingRef.current) {
        frameIdRef.current = requestAnimationFrame(() => {
          // バッファ内の入力を処理
          while (keyBufferRef.current.length > 0) {
            const key = keyBufferRef.current.shift();
            processInput(key);
          }
        });
      }

      return { success: true, status: 'buffered' };
    },
    [typingSession, isCompleted, processInput]
  );

  // 現在の進捗率を計算 - useMemoで最適化
  const progressPercentage = useMemo(() => {
    if (!typingSession || !displayRomaji) return 0;

    if (isCompleted) {
      return 100;
    }

    // 進捗率を最適化されたセッションから直接取得（可能な場合）
    if (typeof typingSession.getCompletionPercentage === 'function') {
      return typingSession.getCompletionPercentage();
    }

    // フォールバック：従来の計算方法
    const typedLength = coloringInfo.typedLength || 0;
    const totalLength = displayRomaji.length;
    return totalLength > 0 ? Math.floor((typedLength / totalLength) * 100) : 0;
  }, [typingSession, displayRomaji, coloringInfo, isCompleted]);

  // キーバッファの長さを提供（監視用）
  const bufferLength = useMemo(
    () => inputSystem.current ? 
      inputSystem.current.getBufferLength() : 
      keyBufferRef.current.length,
    []
  );

  // 統計情報の計算 - useMemoで最適化
  const lastStatsCalcTimeRef = useRef(0);
  const lastStatsRef = useRef(null);
  const stats = useMemo(() => {
    // パフォーマンス最適化: 統計情報の計算を遅延実行
    const now = Date.now();
    const timeElapsedSinceLastCalc = now - (lastStatsCalcTimeRef.current || 0);
    
    // 計算間隔を制限（設定値以内の再計算をスキップ）
    if (timeElapsedSinceLastCalc < performanceConfig.statsUpdateInterval && 
        lastStatsRef.current && !isCompleted) {
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

    // KPM計算：typingmania-refスタイルの高速版
    const kpm = TypingUtils.calculateWeatherTypingKPM(
      correctCount,
      elapsedTimeMs,
      statistics.problemStats
    );

    const rank = TypingUtils.getKPMRank(kpm);
    const rankColor = TypingUtils.getRankColor(rank);
    
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
      rankColor,
      problemKPMs: statistics.problemKPMs,
      problemStats: statistics.problemStats,
    };
    
    // レンダリングがすぐ必要ないデータはキャッシュに保存
    lastStatsRef.current = newStats;
    
    return newStats;
  }, [statistics, isCompleted, performanceConfig.statsUpdateInterval]);

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
      
      // typingmania-ref風の拡張機能
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
      bufferLength,
      initializeSession,
      handleInput,
      completeProblem,
    ]
  );
}
