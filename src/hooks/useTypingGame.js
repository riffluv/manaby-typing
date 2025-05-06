import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TypingUtils from '../utils/TypingUtils';
import soundSystem from '../utils/SoundUtils';
import typingWorkerManager from '../utils/TypingWorkerManager';

/**
 * タイピングゲームのコアロジックを扱うカスタムフック（最適化版）
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
  
  // パフォーマンス監視用（開発用、本番環境では無効）
  const perfRef = useRef({
    lastInputTime: 0,
    inputCount: 0,
    frameRate: 0,
  });

  // 必要最低限のステートだけを管理（再レンダリングの最小化）
  const [displayInfo, setDisplayInfo] = useState({
    romaji: '',
    typedLength: 0,
    currentInputLength: 0,
  });
  
  // 統計情報はほとんどがrefで管理し、表示が必要なものだけをステートに
  const statisticsRef = useRef({
    correctKeyCount: 0,
    mistakeCount: 0,
    startTime: null,
    currentProblemStartTime: null,
    problemStats: [],
  });
  
  // 表示のために必要な最小限の統計情報
  const [displayStats, setDisplayStats] = useState({
    correctKeyCount: 0,
    mistakeCount: 0,
    kpm: 0,
    rank: 'F',
  });
  
  // 状態フラグ（できるだけrefで管理）
  const [errorAnimation, setErrorAnimation] = useState(false);
  const completedRef = useRef(false);
  
  // 進捗率はrefで管理し、変更時だけステート更新
  const progressRef = useRef(0);
  const [progressPercentage, setProgressPercentage] = useState(0);

  // アニメーション用タイマー
  const errorAnimationTimerRef = useRef(null);
  
  // 統計情報更新タイマー（パフォーマンス向上のため一定間隔で更新）
  const statsUpdateTimerRef = useRef(null);

  // 問題完了時の処理
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
      problemKPM: TypingUtils.calculateWeatherTypingKPM(problemKeyCount, problemElapsedMs, [])
    };

    // 統計情報を更新（refで管理）
    const updatedProblemStats = [...stats.problemStats, problemData];
    statisticsRef.current.problemStats = updatedProblemStats;

    // 進捗100%に設定
    progressRef.current = 100;
    setProgressPercentage(100);
    
    // 表示用統計情報を更新
    _updateDisplayStats();
    
    // コールバック呼び出し
    onProblemComplete({
      problemKeyCount,
      problemElapsedMs,
      problemKPM: problemData.problemKPM,
      problemStats: updatedProblemStats
    });
  }, [onProblemComplete]);

  // タイピング入力処理 - 効率的なタイピング処理パス
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
    
    // 10回の入力ごとにフレームレートを更新
    if (perf.inputCount % 10 === 0) {
      perf.frameRate = frameTime > 0 ? Math.round(1000 / frameTime) : 0;
    }

    // 初回入力時は開始時間を記録
    const stats = statisticsRef.current;
    if (!stats.startTime) {
      stats.startTime = now;
      stats.currentProblemStartTime = now;
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

      // 正解カウントを更新（refで管理）
      stats.correctKeyCount += 1;
      
      // 進捗率を更新（大きく変わった場合のみ表示を更新）
      const newProgress = session.getCompletionPercentage();
      if (Math.abs(newProgress - progressRef.current) >= 5) {
        progressRef.current = newProgress;
        setProgressPercentage(newProgress);
      }

      // 表示情報を更新
      const colorInfo = session.getColoringInfo();
      setDisplayInfo(prev => ({
        ...prev,
        typedLength: colorInfo.typedLength,
        currentInputLength: colorInfo.currentInputLength,
      }));

      // 一定間隔で統計表示を更新（毎回の入力では更新しない）
      if (!statsUpdateTimerRef.current) {
        statsUpdateTimerRef.current = setTimeout(() => {
          _updateDisplayStats();
          statsUpdateTimerRef.current = null;
        }, 500);
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

      // エラーカウントを更新（refで管理）
      stats.mistakeCount += 1;

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

      // 一定間隔で統計表示を更新（エラー時も即時更新はしない）
      if (!statsUpdateTimerRef.current) {
        statsUpdateTimerRef.current = setTimeout(() => {
          _updateDisplayStats();
          statsUpdateTimerRef.current = null;
        }, 500);
      }

      return { success: false, status: result.status };
    }
  }, [playSound, completeProblem]);

  // 表示用統計情報を更新する内部関数
  const _updateDisplayStats = useCallback(() => {
    const stats = statisticsRef.current;
    const correctCount = stats.correctKeyCount;
    const missCount = stats.mistakeCount;
    
    // 現在のKPMを計算
    const startTime = stats.startTime || Date.now();
    const elapsedTimeMs = Date.now() - startTime;
    const kpm = TypingUtils.calculateWeatherTypingKPM(
      correctCount,
      elapsedTimeMs,
      stats.problemStats
    );
    const rank = TypingUtils.getRank(kpm);
    
    // 表示用統計情報を更新
    setDisplayStats({
      correctKeyCount: correctCount,
      mistakeCount: missCount,
      kpm,
      rank,
    });
  }, []);

  // セッション初期化処理
  const initializeSession = useCallback((problem) => {
    if (!problem) return;

    try {
      // セッションリセット前に前のセッションのタイマーをクリア
      if (statsUpdateTimerRef.current) {
        clearTimeout(statsUpdateTimerRef.current);
        statsUpdateTimerRef.current = null;
      }
      
      if (errorAnimationTimerRef.current) {
        clearTimeout(errorAnimationTimerRef.current);
        errorAnimationTimerRef.current = null;
      }

      // 新しいタイピングセッションを作成
      const session = TypingUtils.createTypingSession(problem);
      if (!session) return;

      // セッションをrefに保存
      sessionRef.current = session;

      // 表示に必要な情報だけを更新
      setDisplayInfo({
        romaji: session.displayRomaji,
        typedLength: 0,
        currentInputLength: 0,
      });
      
      // 完了フラグをリセット
      completedRef.current = false;
      setErrorAnimation(false);

      // 進捗を初期化
      progressRef.current = 0;
      setProgressPercentage(0);

      // 統計情報もリセット（refで管理）
      statisticsRef.current = {
        correctKeyCount: 0,
        mistakeCount: 0,
        startTime: null,
        currentProblemStartTime: null,
        problemStats: []
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
      };
      
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
      if (statsUpdateTimerRef.current) {
        clearTimeout(statsUpdateTimerRef.current);
      }
    };
  }, []);

  // 統計情報オブジェクト（完全なメモ化）
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
      frameRate: perfRef.current.frameRate,  // 開発用
    };
  }, [displayStats]);

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
      problemCount: statisticsRef.current.problemStats ? 
        statisticsRef.current.problemStats.length : 0,
      endpoint
    };

    return typingWorkerManager.submitRanking(recordData);
  }, [stats]);

  // 返り値をメモ化して不要な再レンダリングを防止
  return useMemo(() => ({
    // 状態（必要最低限を公開）
    typingSession: sessionRef.current,
    displayRomaji: displayInfo.romaji,
    errorAnimation,
    coloringInfo: {
      typedLength: displayInfo.typedLength,
      currentInputLength: displayInfo.currentInputLength,
    },
    isCompleted: completedRef.current,
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
    
    // デバッグ情報（開発環境のみ）
    _debug: process.env.NODE_ENV === 'development' ? {
      frameRate: perfRef.current.frameRate,
      sessionSize: sessionRef.current ? 
        JSON.stringify(sessionRef.current).length : 0,
    } : null,
  }), [
    displayInfo.romaji,
    displayInfo.typedLength,
    displayInfo.currentInputLength,
    errorAnimation,
    stats,
    progressPercentage,
    initializeSession,
    handleInput,
    completeProblem,
    submitScore
  ]);
}
