import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TypingUtils from '../utils/TypingUtils';
import soundSystem from '../utils/SoundUtils';
import typingWorkerManager from '../utils/TypingWorkerManager';
import MCPUtils from '../utils/MCPUtils';

// デバッグフラグ - リファクタリング後の動作確認用
const DEBUG_TYPING = false;
const DEBUG_WORKER = false;
const DEBUG_PERFORMANCE = false;

// 定期クリーンアップのための定数を追加
const HISTORY_CLEANUP_INTERVAL = 30000; // 30秒ごとにクリーンアップ
const MAX_HISTORY_SIZE = 500; // 変更：1000 → 500に削減

/**
 * タイピングゲームのコアロジックを扱うカスタムフック
 * typingmania-refを参考にした高性能実装に対応
 * パフォーマンスを最大限に最適化したリアルタイム処理を実現
 * Web Workerを活用して、UI描画とバックグラウンド処理を分離
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
  onProblemComplete = () => { },
  throttleMs = 0, // 0に変更：高リフレッシュレート向けに調整可能に
} = {}) {
  // パフォーマンスのためにレンダリングカウントを追跡（開発用）
  const renderCount = useRef(0);

  // リファクタリング用のデバッグ情報
  const typingDebugInfo = useRef({
    totalProcessed: 0,
    cachedHits: 0,
    workerCalls: 0,
    errorCount: 0,
    processingTime: [],
    lastActivityTime: Date.now(),
    predictedPathHits: 0
  });

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
    problemStats: [], // 明示的に空の配列として初期化
  });
  const [isCompleted, setIsCompleted] = useState(false);

  // 入力履歴の管理（Web Workerに送信するため）
  const inputHistoryRef = useRef([]);

  // 最適化された入力処理システム：typingmania-refスタイル
  // 入力バッファリングを参照オブジェクトとして保持
  const inputSystem = useRef(null);

  // キー入力バッファリングと節流のための参照
  const keyBufferRef = useRef([]);
  const lastProcessTimeRef = useRef(0);
  const isProcessingRef = useRef(false);
  const frameIdRef = useRef(null);

  // 高リフレッシュレート対応のRAF処理の最適化
  const rafCallbackTimeRef = useRef(0);
  const displayRefreshRateRef = useRef(60); // デフォルト値、後で実測
  const frameIntervalRef = useRef(1000 / 60); // デフォルト16.67ms（60Hz）

  // typingmania-ref風のパフォーマンス設定
  const performanceConfig = useRef({
    // 一度に処理する最大文字数
    maxBatchSize: 10,
    // 統計情報の再計算頻度（ミリ秒）
    statsUpdateInterval: 100,
    // キー入力の処理間隔（ミリ秒）- 高負荷時は自動調整
    processingThreshold: throttleMs || 0, // 0に変更：制限なし（高リフレッシュレート対応）
    // 高リフレッシュレートディスプレイ用の最適化設定
    highRefreshRateOptions: {
      enabled: true, // 高リフレッシュレート最適化を有効化
      targetFrameTime: 4, // 240Hz対応（約4.17ms/フレーム）
      adaptiveThrottling: true, // 負荷に応じて自動調整
      useIdleCallback: true, // アイドル時間を使った処理の効率化
    }
  }).current;

  // エラーアニメーション用のタイマーIDを保持
  const errorAnimationTimerRef = useRef(null);

  // WorkerからのデータをメインスレッドUIに反映する
  const workerUpdateUIRef = useRef(false);

  // 入力履歴の最大サイズを制限する定数
  const MAX_HISTORY_SIZE = 1000;

  // Web Workerとの通信ログを記録（デバッグ用）
  const logWorkerActivity = useCallback((action, details) => {
    if (DEBUG_WORKER) {
      console.log(`[Worker通信] ${action}:`, details);
    }
  }, []);

  // 共通化: Workerに統計計算を依頼する関数
  const requestWorkerStatistics = useCallback((updateUI = false) => {
    if (!isCompleted && statistics.correctKeyCount > 0) {
      logWorkerActivity('統計計算依頼', {
        correctCount: statistics.correctKeyCount,
        startTime: statistics.startTime
      });

      return typingWorkerManager
        .calculateStatistics({
          correctCount: statistics.correctKeyCount,
          missCount: statistics.mistakeCount,
          startTimeMs: statistics.startTime || Date.now(),
          currentTimeMs: Date.now(),
          problemStats: statistics.problemStats,
        })
        .then(result => {
          // エラーチェックを強化
          if (!result) {
            console.warn('[Worker警告] 統計結果が取得できませんでした');
            return null;
          }

          if (result.error) {
            console.error('[Worker警告] 統計計算エラー:', result.error);
            return null;
          }

          // 成功時の処理
          if (updateUI || workerUpdateUIRef.current) {
            lastStatsRef.current = {
              ...lastStatsRef.current,
              kpm: result.kpm || 0,
              rank: result.rank || 'F',
              accuracy: result.accuracy || 0,
            };
            workerUpdateUIRef.current = false;
          }

          return result;
        })
        .catch(err => {
          console.error('[Worker統計計算エラー]:', err);

          // エラー時にはローカル計算のフォールバック値を使用
          if (updateUI || workerUpdateUIRef.current) {
            const now = Date.now();
            const correctCount = statistics.correctKeyCount;
            const elapsedTimeMs = statistics.startTime ? (now - statistics.startTime) : 0;

            if (elapsedTimeMs > 0 && correctCount > 0) {
              const minutes = elapsedTimeMs / 60000;
              const localKpm = Math.floor(correctCount / minutes);

              lastStatsRef.current = {
                ...lastStatsRef.current,
                kpm: localKpm,
                // シンプルな計算でフォールバック
                rank: localKpm >= 300 ? 'A' : (localKpm >= 200 ? 'B' : (localKpm >= 100 ? 'C' : 'D')),
              };
            }

            workerUpdateUIRef.current = false;
          }

          return null;
        });
    }
    return Promise.resolve(null);
  }, [statistics, isCompleted, logWorkerActivity]);

  // デバッグレポート - 定期的にタイピングの統計情報を表示
  useEffect(() => {
    if (!DEBUG_TYPING) return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - typingDebugInfo.current.lastActivityTime;

      // 最近アクティビティがあった場合のみログを表示
      if (timeSinceLastActivity < 5000) {
        const avgProcessingTime = typingDebugInfo.current.processingTime.length > 0
          ? typingDebugInfo.current.processingTime.reduce((a, b) => a + b, 0) / typingDebugInfo.current.processingTime.length
          : 0;

        console.log('⌨️ タイピング処理統計:', {
          総処理数: typingDebugInfo.current.totalProcessed,
          キャッシュヒット: typingDebugInfo.current.cachedHits,
          予測ヒット: typingDebugInfo.current.predictedPathHits,
          Worker呼び出し: typingDebugInfo.current.workerCalls,
          エラー数: typingDebugInfo.current.errorCount,
          平均処理時間: `${avgProcessingTime.toFixed(2)}ms`,
        });

        // 統計情報をリセット
        typingDebugInfo.current.processingTime = [];
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

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

      // Worker履歴をクリア
      typingWorkerManager.clearInputHistory();
    };
  }, []);

  // 問題完了時の処理 - useCallbackでメモ化（先に定義して後でprocessInputから参照できるようにする）
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
      problemKPM,
    };

    // 新しい問題データを配列に追加
    const updatedProblemStats = [
      ...(statistics.problemStats || []),
      problemData,
    ];

    // 統計情報を更新
    setStatistics((prev) => ({
      ...prev,
      problemKPMs: [...(prev.problemKPMs || []), problemKPM],
      problemStats: updatedProblemStats, // WeTyping公式計算のための詳細データ
    }));

    // Web Workerを使用して入力履歴の分析を行う
    typingWorkerManager
      .processInputHistory()
      .then((result) => {
        if (result && result.success && result.data) {
          const analysisData = result.data;
          console.debug('[Web Worker] 入力履歴の分析結果:', analysisData);

          // 頻度の高いエラーパターンや速度変化などの情報があればログに記録
          if (
            analysisData.errorPatterns &&
            Object.keys(analysisData.errorPatterns).length > 0
          ) {
            const topErrors = Object.entries(analysisData.errorPatterns)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);
            console.info('[Web Worker] 頻出エラーパターン:', topErrors);
          }
        }
      })
      .catch((err) => {
        console.error('[Web Worker] 入力履歴の分析に失敗:', err);
      });

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

  // メインスレッドで処理する入力ハンドリング（高速化バージョン）
  const processInput = useCallback(
    (key, timestamp) => {
      if (!typingSession || isCompleted) return { success: false };

      // デバッグ統計情報の更新
      if (DEBUG_TYPING) {
        typingDebugInfo.current.totalProcessed++;
        typingDebugInfo.current.lastActivityTime = Date.now();
      }

      // パフォーマンス測定開始
      const perfStartTime = performance.now();

      // 統計の開始時間設定
      const now = timestamp || Date.now();
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

      // タイピングセッションを使用して入力を処理（最適化版）
      const halfWidthChar = TypingUtils.convertFullWidthToHalfWidth(key);
      const result = typingSession.processInput(halfWidthChar);

      // ★重要な最適化: Worker記録は非同期バッチ処理に変更
      // 即時フィードバックループとは切り離す
      queueMicrotask(() => {
        // Worker記録用のフラグ
        const isCorrectInput = result.success;

        // Worker入力履歴を記録（ワーカーに送信するため）
        inputHistoryRef.current.push({
          key: halfWidthChar,
          isCorrect: isCorrectInput,
          timestamp: now,
          expectedKey: isCorrectInput
            ? null
            : typingSession.getCurrentExpectedKey?.(),
        });

        // 入力履歴が最大サイズを超えた場合、古い履歴を削除
        if (inputHistoryRef.current.length > MAX_HISTORY_SIZE) {
          console.debug(`[最適化] 入力履歴を削減: ${inputHistoryRef.current.length} → ${MAX_HISTORY_SIZE / 2}件`);
          inputHistoryRef.current = inputHistoryRef.current.slice(-Math.floor(MAX_HISTORY_SIZE / 2));
        }
      });

      if (result.success) {
        // 効果音再生を最優先（即時フィードバックのために最上位に移動）
        if (playSound) {
          // AudioContextの状態を確認して音が確実に鳴るようにする
          if (soundSystem.context && soundSystem.context.state === 'suspended') {
            soundSystem.context.resume();
          }
          // 音声処理優先度を上げる（即時再生）
          soundSystem.play('success', { immediate: true });
        }

        // 色分け情報を更新（即時フィードバックの一部）
        setColoringInfo(typingSession.getColoringInfo());

        // 統計更新（即時ではない更新として分離）
        queueMicrotask(() => {
          setStatistics((prev) => ({
            ...prev,
            correctKeyCount: prev.correctKeyCount + 1,
            currentProblemKeyCount: prev.currentProblemKeyCount + 1,
          }));
        });

        // 完了チェック（これはメインスレッドで処理）
        if (result.status === 'all_completed') {
          completeProblem();
        }

        // パフォーマンス測定
        const latency = performance.now() - perfStartTime;
        if (DEBUG_PERFORMANCE) {
          typingDebugInfo.current.processingTime.push(latency);

          if (latency > 8) { // 8ms (120fps相当)
            console.warn(`[パフォーマンス警告] 正解キー処理に${latency.toFixed(2)}ms要りました`);
          }
        }

        return { success: true, status: result.status };
      } else {
        // エラー処理（即時フィードバックを優先）
        if (playSound) {
          soundSystem.play('error');
        }

        setErrorAnimation(true);

        // エラーアニメーションリセット
        if (errorAnimationTimerRef.current) {
          clearTimeout(errorAnimationTimerRef.current);
        }

        errorAnimationTimerRef.current = setTimeout(() => {
          setErrorAnimation(false);
          errorAnimationTimerRef.current = null;
        }, 200);

        // 統計は非同期で更新（ユーザー体験に直結しない部分）
        queueMicrotask(() => {
          setErrorCount((prev) => prev + 1);
          setStatistics((prev) => ({
            ...prev,
            mistakeCount: prev.mistakeCount + 1,
          }));
        });

        // デバッグ統計情報の更新
        if (DEBUG_TYPING) {
          typingDebugInfo.current.errorCount++;
        }

        // パフォーマンス測定
        const latency = performance.now() - perfStartTime;
        if (DEBUG_PERFORMANCE && latency > 8) {
          console.warn(`[パフォーマンス警告] エラー処理に${latency.toFixed(2)}ms要りました`);
        }

        return { success: false, status: result.status };
      }
    },
    [typingSession, statistics, isCompleted, playSound, completeProblem]
  );

  // ディスプレイのリフレッシュレートを検出して最適化する機能（コンポーネント初期化時に1回実行）
  useEffect(() => {
    // ブラウザ環境でない場合はスキップ
    if (typeof window === 'undefined') return;

    let rafId;
    let frameCount = 0;
    let lastTimestamp = performance.now();
    let measuring = true;

    // リフレッシュレート測定用の関数
    const measureRefreshRate = (timestamp) => {
      if (!measuring) return;

      frameCount++;
      const elapsed = timestamp - lastTimestamp;

      // 1秒間測定
      if (elapsed >= 1000) {
        // 測定したフレームレートを保存（上限は300Hz）
        const detectedFPS = Math.min(Math.round(frameCount * 1000 / elapsed), 300);
        displayRefreshRateRef.current = detectedFPS;
        frameIntervalRef.current = 1000 / detectedFPS;

        console.log(`[パフォーマンス] ディスプレイリフレッシュレート: ${detectedFPS}Hz`);

        // 高リフレッシュレートの場合の最適化設定を調整
        if (detectedFPS > 60) {
          console.log(`[パフォーマンス] 高リフレッシュレート(${detectedFPS}Hz)を検出、最適化モード有効`);
          performanceConfig.highRefreshRateOptions.targetFrameTime = Math.floor(1000 / detectedFPS) - 1;

          // 144Hz以上の場合はさらに特別な最適化を適用
          if (detectedFPS >= 144) {
            console.log('[パフォーマンス] 超高リフレッシュレートモード有効化');
            // タイピング処理の優先度を最大化
            performanceConfig.maxBatchSize = 5; // より小さなバッチサイズでレイテンシを最小化
          }
        }

        measuring = false;
        return;
      }

      rafId = requestAnimationFrame(measureRefreshRate);
    };

    // 測定開始
    rafId = requestAnimationFrame(measureRefreshRate);

    // クリーンアップ
    return () => {
      measuring = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // 高リフレッシュレート対応の入力処理システム
  useEffect(() => {
    // typingmania-ref風の最適化された入力バッファリングシステムを作成
    inputSystem.current = TypingUtils.createInputBufferManager(processInput, {
      initialBufferSize: 16,
      maxBatchSize: performanceConfig.maxBatchSize,
      highRefreshRate: displayRefreshRateRef.current > 60,
      refreshRate: displayRefreshRateRef.current,
    });

    // 定期的にワーカーに統計計算を依頼するインターバル
    let statsIntervalId = null;

    if (typeof window !== 'undefined') {
      statsIntervalId = setInterval(() => {
        // 共通化した関数を使用
        requestWorkerStatistics();
      }, performanceConfig.statsUpdateInterval);
    }

    // 定期的に入力履歴をクリーンアップするインターバル
    let cleanupIntervalId = null;
    if (typeof window !== 'undefined') {
      cleanupIntervalId = setInterval(() => {
        // 入力履歴を定期的にクリーンアップ
        typingWorkerManager.cleanupInputHistory();
      }, HISTORY_CLEANUP_INTERVAL);
    }

    return () => {
      if (inputSystem.current) {
        inputSystem.current.cleanup();
      }
      if (statsIntervalId) {
        clearInterval(statsIntervalId);
      }
      if (cleanupIntervalId) {
        clearInterval(cleanupIntervalId);
      }

      // Worker履歴をクリア
      typingWorkerManager.clearInputHistory();
    };
  }, [
    processInput,
    performanceConfig.maxBatchSize,
    performanceConfig.statsUpdateInterval,
    requestWorkerStatistics,
  ]);

  // パフォーマンスに基づいた自動最適化機能
  useEffect(() => {
    if (!DEBUG_PERFORMANCE) return;

    const optimizeInterval = setInterval(() => {
      if (typingDebugInfo.current.processingTime.length > 10) {
        // 直近10回の処理時間の平均を計算
        const avgTime = typingDebugInfo.current.processingTime
          .slice(-10)
          .reduce((a, b) => a + b, 0) / 10;

        // フレーム時間の50%以上かかっている場合は最適化モードを強化
        if (avgTime > frameIntervalRef.current * 0.5) {
          const newBatchSize = Math.max(1, performanceConfig.maxBatchSize - 1);
          if (newBatchSize !== performanceConfig.maxBatchSize) {
            console.info(`[自動最適化] 処理遅延を検出: バッチサイズを ${performanceConfig.maxBatchSize} → ${newBatchSize} に調整`);
            performanceConfig.maxBatchSize = newBatchSize;
          }
        }
        // 処理に余裕がある場合は徐々にバッチサイズを戻す
        else if (avgTime < frameIntervalRef.current * 0.2 && performanceConfig.maxBatchSize < 10) {
          const newBatchSize = performanceConfig.maxBatchSize + 1;
          console.info(`[自動最適化] 処理に余裕あり: バッチサイズを ${performanceConfig.maxBatchSize} → ${newBatchSize} に増加`);
          performanceConfig.maxBatchSize = newBatchSize;
        }

        // 統計情報をリセット
        typingDebugInfo.current.processingTime = [];
      }
    }, 2000); // 2秒ごとに最適化パラメータを調整

    return () => clearInterval(optimizeInterval);
  }, []);

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

      // Worker関連の状態をリセット
      inputHistoryRef.current = [];
      typingWorkerManager.clearInputHistory();
      workerUpdateUIRef.current = true;

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

  // 最適化された入力処理 - handleInput関数の改善版
  const handleInput = useCallback(
    (key) => {
      if (!typingSession || isCompleted) {
        return { success: false, status: 'inactive_session' };
      }

      // パフォーマンス測定開始（DEV環境のみ）
      const perfStartTime = process.env.NODE_ENV === 'development' ? performance.now() : null;

      // 入力プロセスが高リフレッシュレート対応かどうか判定
      const isHighRefreshRate = displayRefreshRateRef.current >= 120;

      // ★★重要な最適化★★
      // 最優先処理パス: 入力予測マッチング（超高速パス）
      // 予測される次の文字であれば、バッファリングせずに直接処理
      const halfWidthChar = TypingUtils.convertFullWidthToHalfWidth(key.toLowerCase());
      const nextPossibleChars = typingSession.getNextPossibleChars?.();

      if (nextPossibleChars && nextPossibleChars.has(halfWidthChar)) {
        // 最も頻出するパスが確認できたので、最短パスで即時処理
        const result = processInput(key);

        // Worker記録をマイクロタスクでスケジュール（応答性優先）
        queueMicrotask(() => {
          const workerData = {
            key: halfWidthChar,
            isCorrect: result.success,
            timestamp: Date.now(),
            predictedPath: true, // 予測パスを使用
            isHighRefreshRate
          };

          // MCPにメトリクスとして記録（パフォーマンス分析用）
          if (typeof MCPUtils !== 'undefined' && MCPUtils.recordTypingInput) {
            MCPUtils.recordTypingInput(workerData);
          }
        });

        // パフォーマンス測定終了（DEV環境のみ）
        if (perfStartTime && process.env.NODE_ENV === 'development') {
          const latency = performance.now() - perfStartTime;
          if (isHighRefreshRate && latency > (1000 / displayRefreshRateRef.current / 3)) {
            console.warn(`[パフォーマンス警告] 予測パス入力処理に${latency.toFixed(2)}ms要りました（目標: ${(1000 / displayRefreshRateRef.current / 3).toFixed(2)}ms）`);
          }
        }

        return result;
      }

      // 標準処理パス: 最適化されたバッファリングシステム
      if (inputSystem.current) {
        // バッファにキーを追加
        inputSystem.current.addInput(key);

        // バッファ処理戦略を決定（環境に適応）
        const bufferLength = inputSystem.current.getBufferLength();

        if (bufferLength === 1) {
          // 単一キー入力: 応答性優先でマイクロタスク使用
          if (!isProcessingRef.current) {
            isProcessingRef.current = true;
            queueMicrotask(() => {
              inputSystem.current.processBuffer();
              isProcessingRef.current = false;
            });
          }
        } else if (bufferLength > 1) {
          if (isHighRefreshRate) {
            // 高リフレッシュレート環境: バッファ即時処理
            if (!isProcessingRef.current) {
              isProcessingRef.current = true;
              inputSystem.current.processBuffer();
              isProcessingRef.current = false;
            }
          } else {
            // 標準環境: アニメーションフレームで処理（60Hz最適化）
            if (!frameIdRef.current) {
              frameIdRef.current = requestAnimationFrame(() => {
                inputSystem.current.processBuffer();
                frameIdRef.current = null;
              });
            }
          }
        }

        // パフォーマンス警告（開発環境のみ）
        if (perfStartTime && process.env.NODE_ENV === 'development') {
          const latency = performance.now() - perfStartTime;
          const targetLatency = isHighRefreshRate ? 2 : 8; // 高リフレッシュレートなら2ms、それ以外は8ms
          if (latency > targetLatency) {
            console.warn(`[パフォーマンス警告] バッファ入力処理に${latency.toFixed(2)}ms要りました（目標: ${targetLatency}ms）`);
          }
        }

        return { success: true, status: 'buffered' };
      }

      // フォールバックパス: キーバッファに追加
      keyBufferRef.current.push(key);

      // 非同期処理戦略の決定
      if (isHighRefreshRate) {
        // 高リフレッシュレート: 即時処理
        const key = keyBufferRef.current.shift();
        if (key) {
          return processInput(key);
        }
      } else {
        // 標準リフレッシュレート: マイクロタスクでスケジュール
        queueMicrotask(() => {
          if (keyBufferRef.current.length > 0) {
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
    () =>
      inputSystem.current
        ? inputSystem.current.getBufferLength()
        : keyBufferRef.current.length,
    [typingSession, isCompleted] // 入力セッションやステータス変更時に再評価
  );

  // 統計情報の計算 - useMemoで最適化
  const lastStatsCalcTimeRef = useRef(0);
  const lastStatsRef = useRef(null);

  // UIの更新フラグを定期的に設定
  useEffect(() => {
    // UI更新と統計計算を同期させる（500msごと）
    const syncedUpdateInterval = setInterval(() => {
      // UIの更新フラグを設定
      workerUpdateUIRef.current = true;
      // 共通化した関数を利用
      requestWorkerStatistics(true);
    }, 500); // UI更新と統計計算を500msに統一

    return () => clearInterval(syncedUpdateInterval);
  }, [statistics, isCompleted, requestWorkerStatistics]);

  const stats = useMemo(() => {
    // パフォーマンス最適化: 統計情報の計算を遅延実行
    const now = Date.now();
    const timeElapsedSinceLastCalc = now - (lastStatsCalcTimeRef.current || 0);

    // 計算間隔を制限（設定値以内の再計算をスキップ）
    if (
      timeElapsedSinceLastCalc < performanceConfig.statsUpdateInterval &&
      lastStatsRef.current &&
      !isCompleted
    ) {
      return lastStatsRef.current;
    }

    // 実際に再計算が必要なときのみ計算を実行
    lastStatsCalcTimeRef.current = now;

    // メインスレッドで簡単な計算のみ行う
    const correctCount = statistics.correctKeyCount;
    const missCount = statistics.mistakeCount;
    const totalCount = correctCount + missCount;
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    const startTime = statistics.startTime || now;
    const elapsedTimeMs = now - startTime;
    const elapsedTimeSeconds = elapsedTimeMs / 1000;

    // KPM計算はメインスレッドで単純計算（詳細計算はWorkerに依頼済み）
    let kpm = 0;
    if (elapsedTimeMs > 0 && correctCount > 0) {
      const minutes = elapsedTimeMs / 60000;
      kpm = Math.floor(correctCount / minutes);
    }

    // ランク計算もメインスレッドで簡易計算
    let rank = 'F';
    if (kpm >= 400) rank = 'S';
    else if (kpm >= 300) rank = 'A';
    else if (kpm >= 200) rank = 'B';
    else if (kpm >= 150) rank = 'C';
    else if (kpm >= 100) rank = 'D';
    else if (kpm >= 50) rank = 'E';

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
      rankColor: TypingUtils.getRankColor(rank),
      problemKPMs: statistics.problemKPMs,
      problemStats: statistics.problemStats,
    };

    // レンダリングがすぐ必要ないデータはキャッシュに保存
    lastStatsRef.current = newStats;

    return newStats;
  }, [statistics, isCompleted, performanceConfig.statsUpdateInterval]);

  // ランキング登録関数を追加（Web Workerで非同期処理）
  const submitScore = useCallback(
    (username = 'Anonymous', endpoint) => {
      // 統計情報がない場合は送信しない
      if (!stats || !stats.kpm) {
        return Promise.reject(new Error('有効なスコアデータがありません'));
      }

      // 送信データを準備
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

      // Web Workerを使ってバックグラウンドでランキング送信
      return typingWorkerManager.submitRanking(recordData);
    },
    [stats, statistics]
  );

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
      submitScore, // ランキング登録用の関数を追加

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
      submitScore,
    ]
  );
}
