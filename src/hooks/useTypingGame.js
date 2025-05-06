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
    currentCharIndex: 0,
    currentInput: '',
    expectedNextChar: '',
    currentCharRomaji: '',
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

    console.log('【completeProblem】問題データ作成:', {
      problemKeyCount,
      problemElapsedMs,
      タイピング開始時間: stats.currentProblemStartTime,
      現在時間: now
    });

    // 問題の詳細データを作成
    const problemData = {
      problemKeyCount,
      problemElapsedMs,
      problemKPM: problemElapsedMs > 0 ? Math.floor((problemKeyCount / (problemElapsedMs / 60000))) : 0
    };

    console.log('【completeProblem】問題KPM:', problemData.problemKPM);

    // 統計情報を更新（refで管理）
    const updatedProblemStats = [...(stats.problemStats || []), problemData];
    statisticsRef.current.problemStats = updatedProblemStats;

    console.log('【completeProblem】更新された問題データ配列:', updatedProblemStats);

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
      updatedProblemKPMs: updatedProblemStats.map(p => p.problemKPM || 0),
      problemStats: updatedProblemStats
    });
  }, [onProblemComplete]);

  // タイピング入力処理 - パフォーマンス最適化版
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

    // 問題の初回入力時のみ開始時間を記録
    const stats = statisticsRef.current;
    const isFirstInput = !stats.currentProblemStartTime;

    // 入力文字を半角に変換
    const halfWidthChar = TypingUtils.convertFullWidthToHalfWidth(key.toLowerCase());

    // 入力処理（高速化のため直接セッションを操作）
    const result = session.processInput(halfWidthChar);

    // 入力結果によって処理を分岐（最適化版）
    if (result.success) {
      // 正解時の処理
      // 初回正解入力時のみ開始時間を記録
      if (isFirstInput) {
        stats.currentProblemStartTime = now;
      }

      // 効果音再生（スロットリングはSoundUtilsで対応済み）
      if (playSound) {
        soundSystem.playSound('success');
      }

      // 正解カウントを更新（refで管理）
      stats.correctKeyCount += 1;

      // 進捗率を更新（5%以上の変化がある場合のみ表示を更新）
      const newProgress = session.getCompletionPercentage();
      if (Math.abs(newProgress - progressRef.current) >= 5) {
        progressRef.current = newProgress;
        setProgressPercentage(newProgress);
      }

      // 表示情報の最適化（必要最低限の情報のみ更新）
      const colorInfo = session.getColoringInfo();

      // 前回と異なる場合のみ更新（不要な再レンダリングを防止）
      setDisplayInfo(prev => {
        // 複数の値が変わる可能性があるので、個別比較して必要なもののみ更新
        const needsUpdate =
          prev.typedLength !== colorInfo.typedLength ||
          prev.currentInputLength !== colorInfo.currentInputLength ||
          prev.currentCharIndex !== colorInfo.currentCharIndex ||
          prev.currentInput !== colorInfo.currentInput ||
          prev.expectedNextChar !== colorInfo.expectedNextChar ||
          prev.currentCharRomaji !== colorInfo.currentCharRomaji;

        // 更新が必要な場合のみ新しいオブジェクトを返す
        return needsUpdate ? {
          ...prev,
          typedLength: colorInfo.typedLength,
          currentInputLength: colorInfo.currentInputLength,
          currentCharIndex: colorInfo.currentCharIndex || 0,
          currentInput: colorInfo.currentInput || '',
          expectedNextChar: colorInfo.expectedNextChar || '',
          currentCharRomaji: colorInfo.currentCharRomaji || '',
        } : prev; // 変更がなければ同じオブジェクトを返す（再レンダリングを防止）
      });

      // 統計表示の更新を間引く（スロットリング）
      // 前回の更新から500ms以上経過している場合のみ更新
      const statsUpdateDebounceTime = 500; // 500ms
      if (!statsUpdateTimerRef.current &&
        (!stats.lastStatsUpdateTime || now - stats.lastStatsUpdateTime > statsUpdateDebounceTime)) {
        statsUpdateTimerRef.current = setTimeout(() => {
          _updateDisplayStats();
          statsUpdateTimerRef.current = null;
          stats.lastStatsUpdateTime = Date.now();
        }, 100); // タイマーを短くして応答性向上
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

      // デバッグ情報を追加
      console.log('【ミス検出】ミスをカウントしました:', {
        ミス数: stats.mistakeCount,
        正解数: stats.correctKeyCount,
        入力文字: halfWidthChar,
        期待文字: session.getCurrentExpectedKey?.() || 'unknown'
      });

      // エラーアニメーション表示（前のタイマーがある場合はクリアして新しく設定）
      setErrorAnimation(true);

      // 効率化：既存のタイマーをクリア
      if (errorAnimationTimerRef.current) {
        clearTimeout(errorAnimationTimerRef.current);
      }

      // アニメーション終了タイマーを設定
      errorAnimationTimerRef.current = setTimeout(() => {
        setErrorAnimation(false);
        errorAnimationTimerRef.current = null;
      }, 200);

      // 統計表示の更新も必要に応じて行う（エラー時は即時更新）
      _updateDisplayStats();

      return { success: false, status: result.status };
    }
  }, [playSound, completeProblem]);

  // 表示用統計情報を更新する内部関数
  const _updateDisplayStats = useCallback(() => {
    const stats = statisticsRef.current;
    const correctCount = stats.correctKeyCount;
    const missCount = stats.mistakeCount;

    console.log('【_updateDisplayStats】統計情報更新:', {
      correctCount,
      missCount,
      問題データ: stats.problemStats
    });

    // 問題データがある場合は平均KPMを計算
    let kpm = 0;
    if (stats.problemStats && stats.problemStats.length > 0) {
      // Weather Typing方式：各問題のKPMの平均値を使う
      kpm = TypingUtils.calculateAverageKPM(stats.problemStats);
      console.log('【_updateDisplayStats】問題データからのKPM計算:', kpm);
    }

    // KPMが0または計算できない場合は、単純計算を使用
    if (kpm <= 0) {
      // 問題データがない場合または計算に失敗した場合は通常計算
      const startTime = stats.startTime || Date.now();
      const elapsedTimeMs = Date.now() - startTime;

      // ゼロ除算を防ぐ
      if (elapsedTimeMs > 0) {
        kpm = Math.floor(correctCount / (elapsedTimeMs / 60000));
        console.log('【_updateDisplayStats】単純計算によるKPM:', {
          correctCount,
          elapsedTimeMs,
          kpm
        });
      }
    }

    // KPMが依然として0の場合は、最低値として1を設定
    if (kpm <= 0 && correctCount > 0) {
      kpm = 1; // 入力があった場合は最低1を設定
      console.log('【_updateDisplayStats】KPMが0なので最低値1を設定');
    }

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
        currentCharIndex: 0,
        currentInput: '',
        expectedNextChar: session.getCurrentExpectedKey() || '',
        currentCharRomaji: session.patterns[0] ? session.patterns[0][0] : '',
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
      problemCount: statisticsRef.current.problemStats ? statisticsRef.current.problemStats.length : 0,
      endpoint
    };

    return typingWorkerManager.submitRanking(recordData);
  }, [stats]);

  return {
    displayInfo,
    displayStats,
    progressPercentage,
    errorAnimation,
    handleInput,
    initializeSession,
    submitScore,
    stats: stats,
  };
}
