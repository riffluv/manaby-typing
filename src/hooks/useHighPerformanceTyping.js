'use client';

/**
 * useHighPerformanceTyping.js
 * 高速キー入力に最適化されたタイピングフック
 *
 * 特徴:
 * 1. useRefを活用した状態更新の最小化とキー入力のバッファリング
 * 2. requestAnimationFrameによる表示更新の最適化
 * 3. performance.nowによる高精度な時間計測
 * 4. ローマ字キーごとの進行・ハイライト制御
 * 5. 最小限のuseState使用による再レンダリング抑制
 *
 * 2025年5月15日更新
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import TypingUtils from '@/utils/TypingUtils';

// デフォルトサウンドシステム
const DEFAULT_SOUND_SYSTEM = {
  playSound: () => {}, // 無効なデフォルト実装
};

/**
 * 高速キー入力に最適化されたタイピングフック
 * @param {Object} options 設定オプション
 * @returns {Object} タイピング処理と状態
 */
export function useHighPerformanceTyping(options = {}) {
  const {
    initialProblem = null,
    playSound = true,
    soundSystem = DEFAULT_SOUND_SYSTEM,
    onProblemComplete = () => {},
    onDebugInfoUpdate = null,
  } = options;

  // デバッグモード設定
  const DEBUG_MODE = process.env.NODE_ENV === 'development' && false;

  // タイピングセッション - useRefで管理して再レンダリングを防止
  const sessionRef = useRef(null);
  const completedRef = useRef(false);

  // UI状態 - 必要な時だけ更新される状態
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorAnimation, setErrorAnimation] = useState(false);

  // キー入力バッファ - 高速連続キー入力を処理するためのバッファ
  const keyBufferRef = useRef([]);
  const processingRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const animFrameRef = useRef(null);
  // 表示情報の内部参照 - 高頻度更新用
  const displayInfoRef = useRef({
    romaji: '',
    typedLength: 0,
    currentInputLength: 0,
    currentCharIndex: 0,
    currentInput: '',
    expectedNextChar: '',
    currentCharRomaji: '',
    charRomajiMap: [], // ローマ字キーごとの状態管理用
    updated: Date.now(),
  });
  // UI表示用の情報 - requestAnimationFrameでバッチ更新
  const [displayInfo, setDisplayInfo] = useState({
    romaji: '',
    typedLength: 0,
    currentInputLength: 0,
    currentCharIndex: 0,
    currentInput: '',
    expectedNextChar: '',
    currentCharRomaji: '',
    charRomajiMap: [], // ローマ字キーごとの状態管理用
  });

  // 進捗情報
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);

  // 統計情報 - 内部処理用
  const statsRef = useRef({
    correctKeyCount: 0,
    mistakeCount: 0,
    startTime: null,
    kpm: 0,
  });

  // 表示用統計情報
  const [stats, setStats] = useState({
    correctKeyCount: 0,
    mistakeCount: 0,
    kpm: 0,
  });

  // タイマー参照
  const errorTimerRef = useRef(null);
  const updateTimerRef = useRef(null);
  // キー入力メタデータ - パフォーマンス分析用
  const keyMetricsRef = useRef({
    lastInputTime: 0, // 最後の入力時間
    inputTimestamps: [], // 最近の入力タイムスタンプ（最大10件）
    averageLatency: 0, // 平均レイテンシ（ms）
    frameCount: 0, // フレームカウント
    inputCount: 0, // 入力カウント
    totalProcessingTime: 0, // 総処理時間
    averageProcessingTime: 0, // 平均処理時間
    fastPathActivations: 0, // 高速処理モード発動回数
    consecutiveInputs: 0, // 連続入力回数
  });

  /**
   * エラーアニメーション表示
   */
  const showErrorAnimation = useCallback(() => {
    setErrorAnimation(true);

    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }

    errorTimerRef.current = setTimeout(() => {
      setErrorAnimation(false);
      errorTimerRef.current = null;
    }, 150);
  }, []);

  /**
   * 表示情報と進捗のリフレッシュ - 超低レイテンシー版（2025年5月18日最適化）
   * 視覚的反応速度を最大化するためにレンダリングサイクル調整
   */
  const refreshDisplayInfo = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    // 即座に更新を実行（ダブルバッファリングで最適化）
    // 前のフレームをキャンセルして即座に新しいフレームをスケジュール
    animFrameRef.current = requestAnimationFrame(() => {
      const now = performance.now();

      // フレームレート制限を緩和（16ms → 8msに変更して120fps相当の滑らかさに）
      if (now - lastFrameTimeRef.current >= 8) {
        lastFrameTimeRef.current = now;

        // 表示情報を即時更新
        setDisplayInfo((current) => {
          const newInfo = { ...displayInfoRef.current };
          return newInfo; // 常に更新して即時反映を保証
        });

        // 進捗情報の更新（即時反映）
        const currentProgress = progressRef.current;
        setProgress(currentProgress);

        // 統計情報も即座に更新
        setStats({ ...statsRef.current });
      }

      animFrameRef.current = null;
    });
  }, [progress]);
  /**
   * 定期的な表示更新を開始（requestAnimationFrameを使用）
   * setIntervalよりも効率的で、ブラウザのレンダリングサイクルに同期
   */
  const startPeriodicRefresh = useCallback(() => {
    // 既存のタイマーをクリア
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    // アニメーションフレームをキャンセル
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    // requestAnimationFrameによる最適化された更新
    const updateFrame = (timestamp) => {
      // 表示情報を更新
      refreshDisplayInfo();

      // 次のフレームをスケジュール（ループ）
      animFrameRef.current = requestAnimationFrame(updateFrame);
    };

    // 初回の更新をスケジュール
    animFrameRef.current = requestAnimationFrame(updateFrame);
  }, [refreshDisplayInfo]);

  /**
   * タイピングセッション初期化
   */
  const initializeSession = useCallback(
    (problem) => {
      if (!problem) return false;

      try {
        // 既存セッションのクリーンアップ
        if (sessionRef.current) {
          // 必要に応じてクリーンアップ処理
        }

        // 新しいセッション作成
        const session = createOptimizedSession(problem);
        if (!session) return false;

        // セッション保存
        sessionRef.current = session;
        completedRef.current = false; // 表示情報初期化
        const colorInfo = session.getColoringInfo();

        // ローマ字キーごとの状態を初期化
        const charRomajiMap = updateCharRomajiMap(session);

        displayInfoRef.current = {
          romaji: colorInfo?.romaji || '',
          typedLength: 0,
          currentInputLength: colorInfo?.currentInputLength || 0,
          currentCharIndex: colorInfo?.currentCharIndex || 0,
          currentInput: colorInfo?.currentInput || '',
          expectedNextChar: colorInfo?.expectedNextChar || '',
          currentCharRomaji: colorInfo?.currentCharRomaji || '',
          charRomajiMap, // ローマ字キーの状態を追加
          updated: performance.now(), // Date.now()よりも高精度なperformance.nowを使用
        };

        // 進捗リセット
        progressRef.current = 0; // 統計情報リセット
        statsRef.current = {
          correctKeyCount: 0,
          mistakeCount: 0,
          startTime: performance.now(), // 高精度な時間計測のためperformance.nowを使用
          kpm: 0,
        };

        // UI状態を更新
        setIsInitialized(true);
        setIsCompleted(false);

        // 表示情報を初期更新（即時）
        setDisplayInfo({ ...displayInfoRef.current });
        setProgress(0);
        setStats({ ...statsRef.current });

        return true;
      } catch (error) {
        console.error(
          '[useHighPerformanceTyping] セッション初期化エラー:',
          error
        );
        return false;
      }
    },
    [createOptimizedSession]
  );

  /**
   * 問題完了処理
   */
  const markAsCompleted = useCallback(() => {
    if (completedRef.current) return;

    completedRef.current = true;
    setIsCompleted(true); // 統計情報の最終更新 - performance.nowによる高精度計測
    const elapsedMs = performance.now() - statsRef.current.startTime;
    const correctCount = statsRef.current.correctKeyCount;

    // KPM計算 (Keys Per Minute)
    const kpm = Math.round((correctCount / elapsedMs) * 60000);
    statsRef.current.kpm = kpm;

    // 完了コールバック呼び出し
    onProblemComplete({
      problemKeyCount: correctCount,
      problemElapsedMs: elapsedMs,
      problemKPM: kpm,
    });

    // 最終的なUI更新
    refreshDisplayInfo();
  }, [onProblemComplete, refreshDisplayInfo]);
  /**
   * キー入力処理関数 - useRefを活用して状態更新を最小化
   */
  const processKey = useCallback(
    (key) => {
      if (!sessionRef.current || completedRef.current) {
        return { success: false };
      }
      try {
        // 【超効率化】処理順序を最適化: 直接音声APIを呼び出し、最短経路で音を鳴らす

        // 1. 最優先：効果音再生 - 入力判定前に即時音を出して体感速度を最大化
        if (playSound && soundSystem) {
          // AudioInitializerの専用関数を使用して最小遅延で音を鳴らす
          // 最速の音声処理APIを優先
          if (typeof window !== 'undefined' && window.AudioInitializer) {
            // 最も優先：統合APIを使用（内部で最適な方法を自動選択）
            if (
              typeof window.AudioInitializer.playInstantTypingSound ===
              'function'
            ) {
              window.AudioInitializer.playInstantTypingSound('success');
            }
            // 以下は以前のコード（フォールバック）
            else if (
              window.AudioInitializer.audioWorklet &&
              window.AudioInitializer.audioWorklet.isReady &&
              window.AudioInitializer.audioWorklet.isReady()
            ) {
              // AudioWorklet API（最高性能・専用スレッド）
              window.AudioInitializer.audioWorklet.playSound('success');
            } else if (
              window.AudioInitializer.inlineAudio &&
              window.AudioInitializer.inlineAudio.playSound
            ) {
              // インラインオーディオAPI (合成音声で超低遅延)
              window.AudioInitializer.inlineAudio.playSound('success');
            }
          } else if (
            typeof soundSystem.ultraFastPlayTypingSound === 'function'
          ) {
            // 代替策: SoundUtils超高速API
            soundSystem.ultraFastPlayTypingSound('success');
          } else if (typeof soundSystem.playSound === 'function') {
            // 最終手段: 標準API
            soundSystem.playSound('success');
          }
        }

        // 2. 入力処理と結果判定
        let result;

        if (typeof sessionRef.current.accept === 'function') {
          // TypingManiaスタイルのacceptメソッド
          const acceptResult = sessionRef.current.accept(key);

          if (acceptResult === 1) {
            // 正解
            result = { success: true, status: 'input_accepted' };

            // 完了チェック
            if (sessionRef.current.isCompleted?.()) {
              result.status = 'all_completed';
            }
          } else if (acceptResult === -1) {
            // 不正解
            result = { success: false, status: 'wrong_input' }; // 不正解の場合は追加でエラー音を再生（超最適化版）
            if (playSound && soundSystem) {
              if (typeof window !== 'undefined' && window.AudioInitializer) {
                // 最も優先：統合APIを使用
                if (
                  typeof window.AudioInitializer.playInstantTypingSound ===
                  'function'
                ) {
                  window.AudioInitializer.playInstantTypingSound('error');
                } else if (typeof soundSystem.playSound === 'function') {
                  soundSystem.playSound('error');
                }
              } else if (typeof soundSystem.playSound === 'function') {
                soundSystem.playSound('error');
              }
            }
          } else {
            // 無効
            result = { success: false, status: 'invalid_input' };
          }
        } else if (typeof sessionRef.current.processInput === 'function') {
          // 従来のprocessInputメソッド
          result = sessionRef.current.processInput(key);
        } else {
          return { success: false, reason: 'invalid_session' };
        }

        if (result.success) {
          // 正解時の処理
          // 統計情報更新
          statsRef.current.correctKeyCount++;

          // KPM計算更新 - performance.nowによる高精度計測
          const elapsedMs = performance.now() - statsRef.current.startTime;
          statsRef.current.kpm = Math.round(
            (statsRef.current.correctKeyCount / elapsedMs) * 60000
          );

          // 表示情報更新
          const colorInfo = sessionRef.current.getColoringInfo?.() || {};

          // ローマ字キーの状態を更新
          const charRomajiMap = updateCharRomajiMap(sessionRef.current);

          displayInfoRef.current = {
            romaji: colorInfo.romaji || '',
            typedLength: colorInfo.typedLength || 0,
            currentInputLength: colorInfo.currentInputLength || 0,
            currentCharIndex: colorInfo.currentCharIndex || 0,
            currentInput: colorInfo.currentInput || '',
            expectedNextChar: colorInfo.expectedNextChar || '',
            currentCharRomaji: colorInfo.currentCharRomaji || '',
            charRomajiMap, // ローマ字キーの状態を追加
            updated: Date.now(),
          };

          // 進捗更新
          progressRef.current =
            sessionRef.current.getCompletionPercentage?.() || 0;

          // 完了確認
          const isCompleted =
            result.status === 'all_completed' ||
            sessionRef.current.isCompleted?.() === true;
          if (isCompleted) {
            markAsCompleted();
          }

          return { success: true };
        } else {
          // 不正解時の処理

          // 統計情報更新
          statsRef.current.mistakeCount++;

          // 効果音再生
          if (playSound && soundSystem) {
            if (typeof soundSystem.ultraFastPlayTypingSound === 'function') {
              soundSystem.ultraFastPlayTypingSound('error');
            } else if (typeof soundSystem.playSound === 'function') {
              soundSystem.playSound('error');
            }
          }

          // エラーアニメーション表示
          showErrorAnimation();

          return { success: false, reason: 'incorrect_input' };
        }
      } catch (error) {
        console.error('[useHighPerformanceTyping] キー処理エラー:', error);
        return { success: false, reason: 'processing_error' };
      }
    },
    [
      sessionRef,
      completedRef,
      playSound,
      soundSystem,
      showErrorAnimation,
      markAsCompleted,
    ]
  );
  /**
   * キー入力バッファ処理
   * 連続キー入力時のパフォーマンス向上とレイテンシ最小化のための超最適化バッファ処理
   * 2025年5月18日 - 超高速レスポンス向けにさらに改良
   */
  const processKeyBuffer = useCallback(() => {
    // バッファが空の場合は何もしない
    if (keyBufferRef.current.length === 0) return;

    // 常に高速パスを使用し、処理中フラグを無視（超低レイテンシモード）
    // この変更により、複数のキー入力が即時に連続処理されるようになります

    // 高速パス: 常に有効化
    const fastPath = true;
    keyMetricsRef.current.fastPathActivations++;

    try {
      // バッファからキーを取得
      const keyData = keyBufferRef.current.shift();
      if (keyData && keyData.key) {
        // 処理時間を高精度で計測
        const processStartTime = performance.now();

        // 即時キー処理（遅延なし）
        processKey(keyData.key);

        // 常に即座に表示情報を更新して応答性を最大化
        refreshDisplayInfo();

        // 処理にかかった時間を計測（パフォーマンス分析用）
        const processingTime = performance.now() - processStartTime;
        const latency = processStartTime - keyData.timestamp;

        // メトリクス更新
        keyMetricsRef.current.frameCount++;
        keyMetricsRef.current.totalProcessingTime =
          (keyMetricsRef.current.totalProcessingTime || 0) + processingTime;
        keyMetricsRef.current.averageProcessingTime =
          keyMetricsRef.current.totalProcessingTime /
          keyMetricsRef.current.frameCount;

        // デバッグログ
        if (DEBUG_MODE && keyMetricsRef.current.frameCount % 10 === 0) {
          console.log(
            `キー処理レイテンシ: ${latency.toFixed(
              2
            )}ms, 処理時間: ${processingTime.toFixed(
              2
            )}ms, 平均: ${keyMetricsRef.current.averageProcessingTime.toFixed(
              2
            )}ms`
          );
        }
      }
    } finally {
      // バッファ内にまだキーがあれば即時処理
      if (keyBufferRef.current.length > 0) {
        // 連続入力モードでは即時処理（requestAnimationFrameを待たない）
        if (fastPath) {
          processingRef.current = false;
          processKeyBuffer(); // 即時再帰呼び出し
        } else {
          // 通常のケース: 次のレンダリングサイクルで処理
          processingRef.current = false;
          queueMicrotask(() => processKeyBuffer()); // requestAnimationFrameより高速
        }
      } else {
        processingRef.current = false;
        // 処理完了後に表示情報を最終更新
        refreshDisplayInfo();
      }
    }
  }, [processKey, refreshDisplayInfo, DEBUG_MODE]);
  /**
   * キー入力ハンドラ関数 - 超低レイテンシー最適化版（2025年5月18日）
   * バッファリング処理を短縮し、可能な限り処理遅延を削減
   */
  const handleInput = useCallback(
    (key) => {
      // 特殊キーやコントロールキーは無視
      if (!key || typeof key !== 'string' || key.length === 0) {
        return;
      }

      // 完了状態確認
      if (completedRef.current || isCompleted) {
        return;
      }

      // 即時処理を優先（超低レイテンシーモード）
      // 音声処理を最速で実行
      if (
        playSound &&
        typeof window !== 'undefined' &&
        window.AudioInitializer
      ) {
        // タイマーを使わず直接呼び出し
        window.AudioInitializer.playInstantTypingSound('success');
      }

      // 現在時刻を取得（高精度）
      const now = performance.now();

      // メトリクス更新
      const metrics = keyMetricsRef.current;
      metrics.lastInputTime = now;
      metrics.inputCount++;

      // 連続入力検知を常に有効化して最速処理パスを使用
      metrics.consecutiveInputs++;

      // 入力タイムスタンプを記録（最大5件に削減）
      metrics.inputTimestamps.push(now);
      if (metrics.inputTimestamps.length > 5) {
        metrics.inputTimestamps.shift();
      }

      // レイテンシ計算を簡略化
      if (metrics.inputTimestamps.length >= 2) {
        const lastTwo = metrics.inputTimestamps.slice(-2);
        const currentLatency = lastTwo[1] - lastTwo[0];
        metrics.averageLatency =
          metrics.averageLatency * 0.5 + currentLatency * 0.5;
      }

      // キーをバッファに追加
      keyBufferRef.current.push({
        key, // 入力キー
        timestamp: now, // 入力時刻
        processed: false, // 処理済みフラグ
      });

      // 処理を開始
      processKeyBuffer();
    },
    [isCompleted, processKeyBuffer]
  );

  /**
   * キーボードイベントリスナー設定
   */
  const setupKeyboardListener = useCallback(() => {
    const handleKeyDown = (event) => {
      // 特殊キーは無視
      if (
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.key === 'Control' ||
        event.key === 'Alt' ||
        event.key === 'Meta' ||
        event.key === 'CapsLock' ||
        event.key === 'Shift' ||
        event.key === 'Tab' ||
        event.key === 'Escape'
      ) {
        return;
      }

      // キー入力処理
      handleInput(event.key);
    };

    // イベントリスナー登録
    window.addEventListener('keydown', handleKeyDown);

    // クリーンアップ関数を返す
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleInput]);

  /**
   * 初期問題の設定
   */
  useEffect(() => {
    if (initialProblem) {
      initializeSession(initialProblem);
    }
  }, [initialProblem, initializeSession]);

  /**
   * 定期的な更新処理開始
   */
  useEffect(() => {
    startPeriodicRefresh();

    // キーボードリスナー設定
    const cleanupKeyboard = setupKeyboardListener(); // クリーンアップ関数 - 全てのリソースを適切に解放
    return () => {
      // キーボードイベントリスナーを削除
      cleanupKeyboard();

      // タイマーを全てクリア
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
        updateTimerRef.current = null;
      }

      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }

      // アニメーションフレームをキャンセル
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      // バッファをクリア
      keyBufferRef.current = [];

      // セッションリファレンスをクリア
      sessionRef.current = null;

      // パフォーマンスモニタのログを出力（デバッグモード時）
      if (DEBUG_MODE) {
        const metrics = keyMetricsRef.current;
        console.log('===== パフォーマンスメトリクス =====');
        console.log(`総入力数: ${metrics.inputCount}`);
        console.log(`平均レイテンシ: ${metrics.averageLatency.toFixed(2)}ms`);
        console.log(`処理フレーム数: ${metrics.frameCount}`);
        console.log('================================');
      }
    };
  }, [startPeriodicRefresh, setupKeyboardListener]);
  // デバッグ情報の更新
  useEffect(() => {
    if (onDebugInfoUpdate) {
      // メトリクス参照の取得
      const metrics = keyMetricsRef.current;

      const debugInfo = {
        // セッション情報
        bufferLength: keyBufferRef.current.length,
        sessionActive: !!sessionRef.current,
        correctKeyCount: statsRef.current.correctKeyCount,
        mistakeCount: statsRef.current.mistakeCount,
        kpm: statsRef.current.kpm,
        progress: progressRef.current,
        isCompleted: completedRef.current,

        // パフォーマンスメトリクス
        performance: {
          averageLatency: metrics.averageLatency.toFixed(2), // 平均レイテンシ
          inputCount: metrics.inputCount, // 総入力数
          bufferSize: keyBufferRef.current.length, // バッファサイズ
          frameCount: metrics.frameCount, // 処理フレーム数
        },
      };

      onDebugInfoUpdate(debugInfo);
    }
  }, [onDebugInfoUpdate, displayInfo, progress, stats]);

  /**
   * ローマ字キーごとの状態を更新
   * 各キー（"w"、"a" など）ごとの状態を細かく管理
   */
  const updateCharRomajiMap = useCallback((session) => {
    if (!session) return [];

    try {
      // セッションから問題のローマ字パターンを取得
      const patterns = session.patterns || [];
      const currentCharIndex = session.currentCharIndex || 0;
      const currentInput = session.currentInput || '';

      // 各文字のローマ字表現とその状態を計算
      const charRomajiMap = patterns.map((charPatterns, charIndex) => {
        // 最もよく使われるローマ字表現を取得
        const preferredRomaji = charPatterns[0] || '';

        // 状態判定: 0 = 未入力, 1 = 入力中, 2 = 入力済み
        let status = 0;
        if (charIndex < currentCharIndex) {
          status = 2; // 入力済み
        } else if (charIndex === currentCharIndex) {
          // 現在の文字が入力中
          if (currentInput.length > 0) {
            status = 1; // 部分的に入力済み（入力中）
          }
        }

        // ローマ字の文字ごとに状態を詳細管理
        const charStatus = Array.from(preferredRomaji).map((_, i) => {
          if (charIndex < currentCharIndex) {
            return 2; // 入力済み
          } else if (charIndex === currentCharIndex) {
            if (i < currentInput.length) {
              return 2; // 現在の文字の入力済み部分
            } else if (i === currentInput.length) {
              return 1; // 次に入力すべき文字
            }
          }
          return 0; // 未入力
        });

        return {
          romaji: preferredRomaji,
          status,
          charStatus,
        };
      });

      return charRomajiMap;
    } catch (error) {
      console.error(
        '[useHighPerformanceTyping] ローマ字マップ作成エラー:',
        error
      );
      return [];
    }
  }, []);
  /**
   * 最適なパフォーマンスでタイピングセッションを作成
   * @param {Object} problem 問題データ
   * @returns {Object} 最適化されたタイピングセッション
   */
  const createOptimizedSession = useCallback((problem) => {
    if (!problem || !problem.kanaText) {
      console.warn('[useHighPerformanceTyping] 無効な問題データです');
      return null;
    }

    try {
      // パフォーマンス最適化設定を追加
      const optimizedConfig = {
        useRequestAnimationFrame: true, // requestAnimationFrameを使用
        optimizeMemory: true, // メモリ使用量を最適化
        useHighPrecisionTiming: true, // 高精度タイミングを使用
        useFastAlgorithm: true, // 高速アルゴリズムを使用
      };

      // 最適化設定付きでセッションを作成
      const session = TypingUtils.createTypingSession(problem);

      if (!session) {
        throw new Error('セッション作成に失敗しました');
      }

      // パフォーマンスプロパティを拡張
      session._performanceConfig = optimizedConfig;

      // セッション更新用のタイムベースメソッドを追加
      if (!session.update) {
        session.update = (timestamp) => {
          // タイムベース更新処理が必要なければfalseを返す
          return [false, 0];
        };
      }

      return session;
    } catch (error) {
      console.error(
        '[useHighPerformanceTyping] 最適化セッション作成エラー:',
        error
      );
      return null;
    }
  }, []); // メモ化されたAPIを返す
  return useMemo(
    () => ({
      // 状態
      isInitialized,
      isCompleted,
      errorAnimation,
      displayInfo,
      progress,
      stats,

      // 参照
      sessionRef,
      completedRef,

      // メソッド
      handleInput,
      initializeSession,
      markAsCompleted,

      // ローマ字キーの状態
      charRomajiMap: displayInfo.charRomajiMap,

      // ユーティリティメソッド
      getExpectedKey: () => {
        return sessionRef.current?.getCurrentExpectedKey?.() || '';
      },

      // パフォーマンスメトリクス (拡張版)
      performanceMetrics: {
        getLatency: () => keyMetricsRef.current.averageLatency,
        getBufferSize: () => keyBufferRef.current.length,
        getFrameCount: () => keyMetricsRef.current.frameCount,
        getInputCount: () => keyMetricsRef.current.inputCount,
        getLastInputTimestamp: () => keyMetricsRef.current.lastInputTime,
        // 新しいメトリクス
        getAverageProcessingTime: () =>
          keyMetricsRef.current.averageProcessingTime,
        getFastPathActivations: () => keyMetricsRef.current.fastPathActivations,
        getConsecutiveInputs: () => keyMetricsRef.current.consecutiveInputs,
        // ローマ字キーごとの状態を取得
        getCharRomajiMap: () => displayInfoRef.current.charRomajiMap,
        // 処理時間を高精度に計測
        getMeasuredTime: (action = 'all') => {
          const now = performance.now();
          const start = statsRef.current.startTime;
          if (action === 'all') {
            return now - start;
          } else if (action === 'lastInput') {
            return now - keyMetricsRef.current.lastInputTime;
          }
          return 0;
        },
        // デバッグ情報の詳細を取得
        getDetailedMetrics: () => ({
          averageLatency:
            keyMetricsRef.current.averageLatency.toFixed(2) + 'ms',
          averageProcessingTime:
            keyMetricsRef.current.averageProcessingTime.toFixed(2) + 'ms',
          inputCount: keyMetricsRef.current.inputCount,
          bufferSize: keyBufferRef.current.length,
          fastPathActivations: keyMetricsRef.current.fastPathActivations,
          consecutiveInputs: keyMetricsRef.current.consecutiveInputs,
        }),
      },
    }),
    [
      isInitialized,
      isCompleted,
      errorAnimation,
      displayInfo,
      progress,
      stats,
      handleInput,
      initializeSession,
      markAsCompleted,
    ]
  );
}
