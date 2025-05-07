/**
 * useTypingGame.js
 * タイピングゲームの核となるカスタムフック
 * リファクタリング済み（2025年5月7日）
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TypingUtils from '../utils/TypingUtils';
import soundSystem from '../utils/SoundUtils';
import typingWorkerManager from '../utils/TypingWorkerManager';

/**
 * タイピングゲームのコアロジックを扱うカスタムフック
 * MCPアーキテクチャと連携した高性能実装
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

  // パフォーマンス監視用
  const perfRef = useRef({
    lastInputTime: 0,
    inputCount: 0,
    frameRate: 0,
    inputTimings: [], // 入力タイミング分析用
  });

  // 表示情報の状態
  const [displayInfo, setDisplayInfo] = useState({
    romaji: '',
    typedLength: 0,
    currentInputLength: 0,
    currentCharIndex: 0,
    currentInput: '',
    expectedNextChar: '',
    currentCharRomaji: '',
  });

  // 統計情報はほとんどがrefで管理（再レンダリング最小化）
  const statisticsRef = useRef({
    correctKeyCount: 0,
    mistakeCount: 0,
    startTime: null,
    currentProblemStartTime: null,
    problemStats: [],
    lastStatsUpdateTime: null,
  });

  // 表示用統計情報
  const [displayStats, setDisplayStats] = useState({
    correctKeyCount: 0,
    mistakeCount: 0,
    kpm: 0,
    rank: 'F',
  });

  // UI状態
  const [errorAnimation, setErrorAnimation] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);

  // 状態フラグ（refで管理）
  const completedRef = useRef(false);
  const progressRef = useRef(0);

  // タイマー参照
  const errorAnimationTimerRef = useRef(null);
  const statsUpdateTimerRef = useRef(null);

  // パフォーマンス最適化のためのデータ参照
  const lastAnimationFrameRef = useRef(null);
  const pendingUIUpdatesRef = useRef({
    hasUpdates: false,
    displayInfo: null,
    progress: null,
    stats: null,
    error: false
  });

  /**
   * 問題完了時の処理
   */
  const completeProblem = useCallback(() => {
    // すでに完了済みなら何もしない
    if (completedRef.current) return;

    // 完了フラグを設定
    completedRef.current = true;

    // 問題ごとの統計情報を計算
    const now = Date.now();
    const stats = statisticsRef.current;
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

    // 統計情報を更新（refで管理）
    const updatedProblemStats = [...(stats.problemStats || []), problemData];
    statisticsRef.current.problemStats = updatedProblemStats;

    // 進捗100%に設定
    progressRef.current = 100;
    setProgressPercentage(100);

    // 表示用統計情報を更新
    _updateDisplayStats();

    // 効果音再生を削除
    // リザルト画面と同じ音のため不自然だという指摘に対応

    // コールバック呼び出し
    onProblemComplete({
      problemKeyCount,
      problemElapsedMs,
      problemKPM: problemData.problemKPM,
      updatedProblemKPMs: updatedProblemStats.map(p => p.problemKPM || 0),
      problemStats: updatedProblemStats
    });
  }, [onProblemComplete, playSound]);

  /**
   * UI更新をバッチ処理するためのアニメーションフレーム処理
   */
  const processUIUpdates = useCallback(() => {
    const pendingUpdates = pendingUIUpdatesRef.current;

    // 更新が必要ないなら何もしない
    if (!pendingUpdates.hasUpdates) return;

    // 高速化: 複数回の更新をハイパフォーマンスモードでバッチ処理
    // React 18以上では自動バッチ処理されるが、念のため明示的に最適化
    const updateFunction = () => {
      // 各UI要素を必要に応じて更新（最小限に抑える）
      if (pendingUpdates.displayInfo) {
        setDisplayInfo(pendingUpdates.displayInfo);
      }

      if (pendingUpdates.progress !== null) {
        setProgressPercentage(pendingUpdates.progress);
      }

      if (pendingUpdates.stats) {
        setDisplayStats(pendingUpdates.stats);
      }

      if (pendingUpdates.error) {
        setErrorAnimation(true);

        // エラーアニメーションを一定時間後に消す
        if (errorAnimationTimerRef.current) {
          clearTimeout(errorAnimationTimerRef.current);
        }

        errorAnimationTimerRef.current = setTimeout(() => {
          setErrorAnimation(false);
          errorAnimationTimerRef.current = null;
        }, 200);
      }

      // 保留中の更新をクリア
      pendingUIUpdatesRef.current = {
        hasUpdates: false,
        displayInfo: null,
        progress: null,
        stats: null,
        error: false
      };

      // アニメーションフレーム参照をクリア
      lastAnimationFrameRef.current = null;
    };

    // React 18の場合はflushSyncを使用、それ以外は直接実行
    if (typeof React !== 'undefined' && React.flushSync) {
      React.flushSync(updateFunction);
    } else {
      updateFunction();
    }
  }, []);

  /**
   * UI更新をスケジュール
   */
  const scheduleUIUpdate = useCallback((updates = {}) => {
    // 更新情報をマージ
    const pendingUpdates = pendingUIUpdatesRef.current;

    if (updates.displayInfo) {
      pendingUpdates.displayInfo = updates.displayInfo;
      pendingUpdates.hasUpdates = true;
    }

    if (updates.progress !== undefined) {
      pendingUpdates.progress = updates.progress;
      pendingUpdates.hasUpdates = true;
    }

    if (updates.stats) {
      pendingUpdates.stats = updates.stats;
      pendingUpdates.hasUpdates = true;
    }

    if (updates.error) {
      pendingUpdates.error = true;
      pendingUpdates.hasUpdates = true;
    }

    // アニメーションフレームがまだスケジュールされていなければスケジュール
    if (!lastAnimationFrameRef.current && pendingUpdates.hasUpdates) {
      // 高速化: モニターのリフレッシュレートに合わせた処理
      // 60Hz以上の場合は高速化
      if (typeof window !== 'undefined' && window.requestIdleCallback && !updates.error) {
        // アイドル時間を利用してUIを更新（エラー以外の低優先度更新）
        lastAnimationFrameRef.current = window.requestIdleCallback(processUIUpdates, { timeout: 50 });
      } else {
        lastAnimationFrameRef.current = requestAnimationFrame(processUIUpdates);
      }
    }
  }, [processUIUpdates]);

  /**
   * タイピング入力処理 - パフォーマンス最適化版
   */
  const handleInput = useCallback((key) => {
    // セッションがない、または完了済みなら何もしない
    const session = sessionRef.current;
    if (!session || completedRef.current) {
      return { success: false, status: 'inactive_session' };
    }

    // パフォーマンス測定開始
    const now = Date.now();
    const perf = perfRef.current;
    const frameTime = perf.lastInputTime > 0 ? now - perf.lastInputTime : 0;
    perf.lastInputTime = now;
    perf.inputCount++;

    // 入力タイミングを記録（最大100件まで）
    if (perf.inputTimings.length < 100) {
      perf.inputTimings.push({ time: now, key });
    }

    // 10回の入力ごとにフレームレートを更新
    if (perf.inputCount % 10 === 0) {
      perf.frameRate = frameTime > 0 ? Math.round(1000 / frameTime) : 0;
    }

    // 問題の初回入力時のみ開始時間を記録
    const stats = statisticsRef.current;
    const isFirstInput = !stats.currentProblemStartTime;

    // 入力文字を半角に変換（高速化）
    const halfWidthChar = key.toLowerCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g,
      s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

    // 入力処理（高速化のため直接セッションを操作）
    // MCP連携: MCPモデルが利用可能な場合は直接パスを使用
    let result;
    if (typeof window !== 'undefined' && window._mcp && window._mcp._typingModel) {
      const typingModel = window._mcp._typingModel;
      if (typeof typingModel.processLocalInput === 'function') {
        // MCPモデルの高速パスを使用（最高性能）
        result = typingModel.processLocalInput(halfWidthChar);

        // 結果の処理は最小限に（MCPが内部で処理済み）
        if (result.success) {
          // 効果音再生のみMain UIスレッドで実行
          if (playSound) {
            queueMicrotask(() => {
              soundSystem.playSound('success');
            });
          }

          if (result.status === 'all_completed') {
            queueMicrotask(() => {
              completeProblem();
            });
          }

          // UI更新をMCPが担当するため、最小限にとどめる
          // 必要に応じてスロットリングされた表示更新のみ
          if (perf.inputCount % 3 === 0) { // 3回に1回だけ更新
            queueMicrotask(() => {
              _updateDisplayDataFromMCP();
            });
          }

          return result;
        } else {
          // 不正解時のみイベント処理（効果音とエラー表示）
          if (playSound) {
            soundSystem.playSound('error');
          }

          // エラー表示のみ即時更新
          scheduleUIUpdate({ error: true });
          return result;
        }
      }
    }

    // 従来のセッション処理をフォールバックとして使用
    result = session.processInput(halfWidthChar);

    // 入力結果によって処理を分岐
    if (result.success) {
      // 正解時の処理
      // 初回正解入力時のみ開始時間を記録
      if (isFirstInput) {
        stats.currentProblemStartTime = now;
        stats.startTime = stats.startTime || now;
      }

      // 効果音再生
      if (playSound) {
        soundSystem.playSound('success');
      }

      // 正解カウントを更新
      stats.correctKeyCount += 1;

      // 進捗率を更新（5%以上の変化がある場合のみ表示を更新）
      const newProgress = session.getCompletionPercentage();
      if (Math.abs(newProgress - progressRef.current) >= 5) {
        progressRef.current = newProgress;
        scheduleUIUpdate({ progress: newProgress });
      }

      // 表示情報の更新をスケジュール
      const colorInfo = session.getColoringInfo();
      scheduleUIUpdate({
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

      // 統計表示の更新（スロットリング）
      const statsUpdateDebounceTime = 1000; // 1000msにスロットリング強化
      if (!statsUpdateTimerRef.current &&
        (!stats.lastStatsUpdateTime || now - stats.lastStatsUpdateTime > statsUpdateDebounceTime)) {
        statsUpdateTimerRef.current = setTimeout(() => {
          _updateDisplayStats();
          statsUpdateTimerRef.current = null;
          stats.lastStatsUpdateTime = now;
        }, 100);
      }

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

      // エラーカウントを更新
      stats.mistakeCount += 1;

      // エラーアニメーション表示
      scheduleUIUpdate({ error: true });

      // 統計表示の更新（即時）
      _updateDisplayStats();

      return { success: false, status: result.status };
    }
  }, [playSound, completeProblem, scheduleUIUpdate]);

  /**
   * MCPからデータを取得して表示を更新する内部関数
   * @private
   */
  const _updateDisplayDataFromMCP = useCallback(() => {
    // MCPが利用可能な場合のみ実行
    if (typeof window === 'undefined' || !window._mcp || !window._mcp._typingModel) {
      return;
    }

    try {
      const typingModel = window._mcp._typingModel;

      // 表示情報を最小限取得
      const displayInfo = typingModel.getDisplayInfo();
      if (!displayInfo) return;

      // 表示情報を更新
      scheduleUIUpdate({
        displayInfo: {
          romaji: displayInfo.romaji || '',
          typedLength: displayInfo.typedLength || 0,
          currentInputLength: 0, // 互換性維持
          currentCharIndex: 0, // 互換性維持
          currentInput: displayInfo.currentInput || '',
          expectedNextChar: displayInfo.nextChar || '',
          currentCharRomaji: displayInfo.currentCharRomaji || '',
        },
        progress: displayInfo.progress || progressRef.current
      });

      // 完了状態を確認
      if (displayInfo.isCompleted && !completedRef.current) {
        // 完了処理を遅延実行
        queueMicrotask(() => {
          completeProblem();
        });
      }
    } catch (error) {
      // エラーが発生しても処理を続行
      console.error('MCP表示データ更新エラー:', error);
    }
  }, [scheduleUIUpdate, completeProblem]);

  /**
   * 表示用統計情報を更新する内部関数
   */
  const _updateDisplayStats = useCallback(() => {
    const stats = statisticsRef.current;
    const correctCount = stats.correctKeyCount;
    const missCount = stats.mistakeCount;

    // 問題データがある場合は平均KPMを計算
    let kpm = 0;
    if (stats.problemStats && stats.problemStats.length > 0) {
      // 各問題のKPMの平均値を使用
      kpm = TypingUtils.calculateAverageKPM(stats.problemStats);
    }

    // KPMが0または計算できない場合は、単純計算を使用
    if (kpm <= 0) {
      // 問題データがない場合または計算に失敗した場合は通常計算
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

    // 表示用統計情報の更新をスケジュール
    scheduleUIUpdate({
      stats: {
        correctKeyCount: correctCount,
        mistakeCount: missCount,
        kpm,
        rank,
      }
    });
  }, [scheduleUIUpdate]);

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

      if (errorAnimationTimerRef.current) {
        clearTimeout(errorAnimationTimerRef.current);
        errorAnimationTimerRef.current = null;
      }

      if (lastAnimationFrameRef.current) {
        cancelAnimationFrame(lastAnimationFrameRef.current);
        lastAnimationFrameRef.current = null;
      }

      // 新しいタイピングセッションを作成
      const session = TypingUtils.createTypingSession(problem);
      if (!session) return;

      // セッションをrefに保存
      sessionRef.current = session;

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
      progressRef.current = 0;
      setProgressPercentage(0);

      // 統計情報もリセット
      statisticsRef.current = {
        correctKeyCount: 0,
        mistakeCount: 0,
        startTime: null,
        currentProblemStartTime: null,
        problemStats: [],
        lastStatsUpdateTime: null
      };

      // 表示用統計情報も初期化
      setDisplayStats({
        correctKeyCount: 0,
        mistakeCount: 0,
        kpm: 0,
        rank: 'F',
      });

      // パフォーマンス測定もリセット
      perfRef.current = {
        lastInputTime: 0,
        inputCount: 0,
        frameRate: 0,
        inputTimings: [],
      };

      // 保留中の更新もクリア
      pendingUIUpdatesRef.current = {
        hasUpdates: false,
        displayInfo: null,
        progress: null,
        stats: null,
        error: false
      };

      // ワーカーも初期化
      typingWorkerManager.clearInputHistory();
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
      if (errorAnimationTimerRef.current) {
        clearTimeout(errorAnimationTimerRef.current);
      }
      if (statsUpdateTimerRef.current) {
        clearTimeout(statsUpdateTimerRef.current);
      }
      if (lastAnimationFrameRef.current) {
        cancelAnimationFrame(lastAnimationFrameRef.current);
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
      problemStats: statisticsRef.current.problemStats,
      frameRate: perfRef.current.frameRate,
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
      problemCount: statisticsRef.current.problemStats?.length || 0,
      endpoint,
      timestamp: Date.now()
    };

    return typingWorkerManager.submitRanking(recordData);
  }, [stats]);

  /**
   * パフォーマンスデータを取得
   */
  const getPerformanceData = useCallback(() => {
    const perf = perfRef.current;
    return {
      frameRate: perf.frameRate,
      inputCount: perf.inputCount,
      inputTimings: [...perf.inputTimings],
      averageTimeBetweenInputs: perf.inputTimings.length > 1
        ? _calculateAverageTimeBetweenInputs(perf.inputTimings)
        : 0
    };
  }, []);

  /**
   * 入力タイミング間の平均時間を計算（内部ヘルパー関数）
   */
  const _calculateAverageTimeBetweenInputs = (timings) => {
    if (timings.length < 2) return 0;

    let totalTime = 0;
    for (let i = 1; i < timings.length; i++) {
      totalTime += timings[i].time - timings[i - 1].time;
    }

    return totalTime / (timings.length - 1);
  };

  // 公開するインターフェース
  return {
    displayInfo,
    displayStats,
    progressPercentage,
    errorAnimation,
    handleInput,
    initializeSession,
    submitScore,
    getPerformanceData,
    stats: stats,
  };
}
