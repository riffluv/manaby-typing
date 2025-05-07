/**
 * useHighPerformanceTyping.js
 * 高性能タイピングゲーム用のReactフック
 * Web WorkerとMCPを統合した高速タイピング処理を実現
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import typingWorkerManager from '../utils/TypingWorkerManager';
import soundUtils from '../utils/SoundUtils';
import TypingUtils from '../utils/TypingUtils';

/**
 * 高性能タイピングゲーム用React Hooks
 * Web WorkerとMCPを活用した高速タイピング処理
 * 
 * @param {Object} options オプション
 * @param {Object} options.initialProblem 初期問題
 * @param {boolean} options.playSound 効果音を再生するか
 * @param {Function} options.onProblemComplete 問題完了時のコールバック
 * @returns {Object} タイピングゲームの状態と操作メソッド
 */
export function useHighPerformanceTyping({
  initialProblem = null,
  playSound = true,
  onProblemComplete = () => { }
} = {}) {
  // タイピングセッションの状態（分割してパフォーマンス向上）
  const [session, setSession] = useState(null);

  // UI表示用の状態（必要最低限に制限）
  const [displayInfo, setDisplayInfo] = useState({
    romaji: '',
    typedLength: 0,
    nextChar: '',
    currentInput: '',
    currentCharRomaji: '',
    isError: false,
    isCompleted: false,
  });

  // 統計情報
  const [stats, setStats] = useState({
    correctKeyCount: 0,
    mistakeCount: 0,
    kpm: 0,
    accuracy: 100,
    rank: 'F',
    elapsedTimeSeconds: 0
  });

  // アニメーション状態
  const [showErrorAnimation, setShowErrorAnimation] = useState(false);

  // コールバック参照（依存性の問題を回避）
  const callbackRef = useRef(onProblemComplete);
  useEffect(() => {
    callbackRef.current = onProblemComplete;
  }, [onProblemComplete]);

  // パフォーマンスメトリクス
  const metricsRef = useRef({
    inputCount: 0,
    lastInputTime: 0,
    startTime: Date.now(),
    frameRate: 0,
    errorCount: 0,
    completionTime: 0
  });

  // UI更新を最適化するための参照
  const displayUpdateTimerRef = useRef(null);
  const statsUpdateTimerRef = useRef(null);

  // 最後の正解・不正解
  const lastResultRef = useRef({
    success: false,
    timestamp: 0
  });

  // 効果音設定
  const soundConfigRef = useRef({
    enabled: playSound,
    successSound: 'buttonsound1',
    errorSound: 'Hit04-1',
    completeSound: 'resultsound'
  });

  /**
   * コンポーネントのマウント/アンマウント時の処理
   */
  useEffect(() => {
    // エフェクト設定
    soundConfigRef.current.enabled = playSound;

    // パフォーマンスメトリクスをリセット
    metricsRef.current = {
      inputCount: 0,
      lastInputTime: Date.now(),
      startTime: Date.now(),
      frameRate: 0,
      errorCount: 0,
      completionTime: 0
    };

    // 初期問題が設定されていれば初期化
    if (initialProblem) {
      initializeSession(initialProblem);
    }

    // クリーンアップ
    return () => {
      // タイマーをクリア
      if (displayUpdateTimerRef.current) {
        clearTimeout(displayUpdateTimerRef.current);
      }
      if (statsUpdateTimerRef.current) {
        clearTimeout(statsUpdateTimerRef.current);
      }
    };
  }, [initialProblem, playSound]);

  /**
   * 表示情報の更新をスケジュール
   * パフォーマンスのため、連続した呼び出しを最適化
   */
  const scheduleDisplayUpdate = useCallback((immediate = false) => {
    // すでにタイマーがある場合はキャンセル
    if (displayUpdateTimerRef.current) {
      clearTimeout(displayUpdateTimerRef.current);
    }

    if (!session) return;

    const updateFunc = () => {
      displayUpdateTimerRef.current = null;

      // Web Workerを使って色分け情報を取得
      typingWorkerManager.getColoringInfo(session)
        .then(coloringInfo => {
          if (!coloringInfo) return;

          const { typedLength, currentInput, expectedNextChar, completed } = coloringInfo;

          // UI更新の最小化（必要な部分のみ更新）
          const romaji = session.displayRomaji || '';

          setDisplayInfo(prev => ({
            ...prev,
            romaji,
            typedLength: typedLength || 0,
            nextChar: expectedNextChar || '',
            currentInput: currentInput || '',
            currentCharRomaji: coloringInfo.currentCharRomaji || '',
            isCompleted: completed || false
          }));

          // 完了チェック
          if (completed && !displayInfo.isCompleted) {
            handleProblemComplete();
          }
        })
        .catch(err => {
          console.error('色分け情報の取得エラー:', err);
        });
    };

    // 即時実行または遅延実行
    if (immediate) {
      updateFunc();
    } else {
      // 16ms = およそ60FPSに対応（最適化）
      displayUpdateTimerRef.current = setTimeout(updateFunc, 16);
    }
  }, [session, displayInfo.isCompleted]);

  /**
   * 定期的な統計情報の更新
   * パフォーマンス最適化のため、更新頻度を制限
   */
  const scheduleStatsUpdate = useCallback((immediate = false) => {
    // すでにタイマーがある場合はスキップ
    if (statsUpdateTimerRef.current) return;

    if (!session) return;

    const updateFunc = () => {
      statsUpdateTimerRef.current = null;

      // スキップフラグ（微細な最適化）
      const now = Date.now();
      const timeSinceLastInput = now - lastResultRef.current.timestamp;

      // 1秒以上入力がなければ更新頻度を下げる
      if (timeSinceLastInput > 1000 && !immediate) {
        statsUpdateTimerRef.current = setTimeout(
          () => scheduleStatsUpdate(true),
          1000
        );
        return;
      }

      // 統計情報を計算
      const startTime = session.startTime || 0;
      const elapsedMs = now - startTime;
      const elapsedTimeSeconds = elapsedMs / 1000;

      // 安全性確認
      if (elapsedMs <= 0) return;

      // KPMとWPM計算（60秒あたりのキー数/ワード数）
      const correctKeyCount = session.typedRomaji ? session.typedRomaji.length : 0;
      const mistakeCount = session.mistakeCount || 0;

      // KPM = キー数 * (60秒 / 経過秒数)
      const kpm = Math.floor((correctKeyCount / elapsedTimeSeconds) * 60);

      // 正確性 = 正解数 / (正解数 + ミス数) * 100%
      const totalAttempts = correctKeyCount + mistakeCount;
      const accuracy = totalAttempts > 0
        ? Math.floor((correctKeyCount / totalAttempts) * 100)
        : 100;

      // ランク計算
      const rank = TypingUtils.getRank(kpm);

      // 統計情報を更新（変更があるときのみ）
      setStats(prev => {
        if (
          prev.correctKeyCount !== correctKeyCount ||
          prev.mistakeCount !== mistakeCount ||
          prev.kpm !== kpm ||
          prev.accuracy !== accuracy ||
          prev.rank !== rank ||
          Math.abs(prev.elapsedTimeSeconds - elapsedTimeSeconds) >= 1
        ) {
          return {
            correctKeyCount,
            mistakeCount,
            kpm,
            accuracy,
            rank,
            elapsedTimeSeconds
          };
        }
        return prev; // 変更なし
      });
    };

    // 即時実行または遅延実行
    if (immediate) {
      updateFunc();
    } else {
      // 500ms = 統計情報更新の頻度（頻繁に更新する必要はない）
      statsUpdateTimerRef.current = setTimeout(updateFunc, 500);
    }
  }, [session]);

  /**
   * セッションの初期化
   */
  const initializeSession = useCallback((problem) => {
    if (!problem) return;

    // 高性能セッションの作成
    const newSession = TypingUtils.createTypingSession(problem);
    if (!newSession) {
      console.error('タイピングセッションの作成に失敗しました');
      return;
    }

    // 開始時間を記録
    newSession.startTime = Date.now();
    newSession.mistakeCount = 0; // ミスカウントを追加

    // セッションを設定
    setSession(newSession);

    // 状態をリセット
    setDisplayInfo({
      romaji: newSession.displayRomaji || '',
      typedLength: 0,
      nextChar: newSession.getCurrentExpectedKey() || '',
      currentInput: '',
      currentCharRomaji: '',
      isError: false,
      isCompleted: false
    });

    // 統計情報をリセット
    setStats({
      correctKeyCount: 0,
      mistakeCount: 0,
      kpm: 0,
      accuracy: 100,
      rank: 'F',
      elapsedTimeSeconds: 0
    });

    // パフォーマンスメトリクスをリセット
    metricsRef.current = {
      inputCount: 0,
      lastInputTime: Date.now(),
      startTime: Date.now(),
      frameRate: 0,
      errorCount: 0,
      completionTime: 0
    };

    // エラーアニメーションをリセット
    setShowErrorAnimation(false);

    // ワーカーをリセット
    typingWorkerManager.resetWorker();

    // よく使われるパターンを事前にロード
    const patterns = problem.kanaText
      ? TypingUtils.parseTextToRomajiPatterns(problem.kanaText)
      : [];
    if (patterns.length > 0) {
      typingWorkerManager.preloadPatterns(patterns);
    }

    // 表示情報を即座に更新
    scheduleDisplayUpdate(true);

    // 統計情報を初期化
    scheduleStatsUpdate(true);

    console.log('タイピングセッションを初期化しました:', newSession.originalText);
  }, [scheduleDisplayUpdate, scheduleStatsUpdate]);

  /**
   * 問題完了時の処理
   */
  const handleProblemComplete = useCallback(() => {
    // 完了時間を記録
    const completionTime = Date.now() - (session?.startTime || Date.now());
    metricsRef.current.completionTime = completionTime;

    // 結果の計算（統計情報を最終更新）
    scheduleStatsUpdate(true);

    // 効果音再生
    if (soundConfigRef.current.enabled) {
      soundUtils.play(soundConfigRef.current.completeSound);
    }

    // 問題ごとの統計情報を生成
    const problemStats = {
      problemKeyCount: session?.typedRomaji?.length || 0,
      problemElapsedMs: completionTime,
      problemKPM: Math.floor((session?.typedRomaji?.length || 0) / (completionTime / 60000)),
      timestamp: Date.now(),
    };

    // コールバック呼び出し
    if (callbackRef.current) {
      callbackRef.current(problemStats);
    }

    // アナリティクス送信（オプショナル）
    try {
      typingWorkerManager.submitRanking({
        ...problemStats,
        text: session?.originalText,
        mistakeCount: session?.mistakeCount || 0
      }).catch(() => { }); // エラーは無視
    } catch (e) {
      // エラーは無視（非クリティカル機能）
    }
  }, [session, scheduleStatsUpdate]);

  /**
   * タイピング入力処理
   * 最適化された高速パスでタイピングを処理
   */
  const handleInput = useCallback((key) => {
    if (!session || displayInfo.isCompleted) return { success: false };

    // パフォーマンス計測用
    const now = Date.now();
    metricsRef.current.inputCount++;

    // フレームレート計算（10回の入力ごと）
    if (metricsRef.current.lastInputTime && metricsRef.current.inputCount % 10 === 0) {
      const frameTime = now - metricsRef.current.lastInputTime;
      metricsRef.current.frameRate = frameTime > 0 ? Math.round(10000 / frameTime) : 0;
    }
    metricsRef.current.lastInputTime = now;

    // WebWorkerを使用して処理
    let result = { success: false };

    // AudioContextの状態がsuspendedの場合は再開（サウンド対応）
    if (playSound && soundUtils.resume) {
      soundUtils.resume();
    }

    // Workerで非同期処理
    typingWorkerManager.processInput({
      session,
      input: key
    })
      .then(workerResult => {
        result = workerResult;

        // 成功時の処理
        if (result.success) {
          lastResultRef.current = {
            success: true,
            timestamp: now
          };

          // 効果音の再生（サウンド対応）
          if (soundConfigRef.current.enabled) {
            soundUtils.play(soundConfigRef.current.successSound);
          }

          // 更新されたセッション情報を適用
          if (workerResult.session) {
            setSession(prevSession => ({
              ...prevSession,
              ...workerResult.session,
              typedRomaji: workerResult.session.typedRomaji || prevSession.typedRomaji,
              currentCharIndex: workerResult.session.currentCharIndex || prevSession.currentCharIndex,
              currentInput: workerResult.session.currentInput || '',
              completed: workerResult.session.completed || false
            }));
          }

          // 表示情報を更新（高速パス）
          scheduleDisplayUpdate();

          // 統計情報を更新（低頻度で良い）
          scheduleStatsUpdate();
        } else {
          // エラー処理
          lastResultRef.current = {
            success: false,
            timestamp: now
          };

          // ミス回数を更新
          setSession(prevSession => ({
            ...prevSession,
            mistakeCount: (prevSession.mistakeCount || 0) + 1
          }));

          // エラー効果音（サウンド対応）
          if (soundConfigRef.current.enabled) {
            soundUtils.play(soundConfigRef.current.errorSound);
          }

          // エラーアニメーション
          setShowErrorAnimation(true);
          setTimeout(() => setShowErrorAnimation(false), 300);

          // 統計情報を更新（ミス時は即時更新）
          scheduleStatsUpdate(true);

          // エラーログ（開発モードのみ）
          if (process.env.NODE_ENV === 'development' && workerResult.errorDetails) {
            console.debug('Typing Error Details:', workerResult.errorDetails);
          }

          // エラー回数カウント
          metricsRef.current.errorCount++;
        }
      })
      .catch(error => {
        console.error('入力処理エラー:', error);
        result = { success: false, error: error.message };
      });

    // 同期的な返却（後で更新される）
    return { success: true, inProgress: true };
  }, [session, displayInfo.isCompleted, scheduleDisplayUpdate, scheduleStatsUpdate, playSound]);

  /**
   * パフォーマンスメトリクスの取得
   */
  const getPerfMetrics = useCallback(() => {
    const metrics = { ...metricsRef.current };

    // Worker側のメトリクスも取得（必要に応じて）
    return typingWorkerManager.getPerformanceMetrics()
      .then(workerMetrics => ({
        client: metrics,
        worker: workerMetrics
      }))
      .catch(() => ({ client: metrics }));
  }, []);

  /**
   * 公開API
   */
  return {
    // 表示情報
    romaji: displayInfo.romaji,
    typedLength: displayInfo.typedLength,
    nextChar: displayInfo.nextChar,
    currentInput: displayInfo.currentInput,
    currentCharRomaji: displayInfo.currentCharRomaji,

    // 統計情報
    stats,

    // パフォーマンス指標
    perfStats: {
      frameRate: metricsRef.current.frameRate || 0
    },

    // 状態フラグ
    isCompleted: displayInfo.isCompleted,
    errorAnimation: showErrorAnimation,

    // 操作メソッド
    handleInput,
    initializeSession,
    getPerfMetrics,

    // 次に入力すべき文字を取得
    getCurrentExpectedKey: () => displayInfo.nextChar,

    // フラグ
    isHighPerformance: true,
  };
}

export default useHighPerformanceTyping;