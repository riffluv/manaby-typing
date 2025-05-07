/**
 * MCPGameScreen.js
 * MCPアーキテクチャを利用した高性能タイピングゲーム画面
 * リファクタリング済み（2025年5月8日）- パフォーマンス最適化
 */
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMCPContext } from '@/utils/MCPUtils';
import styles from '@/styles/GameScreen.module.css';
import { useSoundContext } from '@/contexts/SoundContext';
import TypingDisplay from '@/components/typing/TypingDisplay';
import TypingProgress from '@/components/typing/TypingProgress';
import TypingStats from '@/components/typing/TypingStats';

// MCP通信用の定数
const TypingCommands = {
  INIT_PROBLEM: 'init_problem',
  PROCESS_INPUT: 'process_input',
  COMPLETE_PROBLEM: 'complete_problem',
  PERFORMANCE_REPORT: 'performance_report',
};

const TypingEvents = {
  PROBLEM_INITIALIZED: 'problem_initialized',
  DISPLAY_UPDATED: 'display_updated',
  PROBLEM_COMPLETED: 'problem_completed',
};

/**
 * MCPGameScreen - MCP対応タイピングゲーム画面
 */
const MCPGameScreen = ({ problem, onProblemComplete, onNavigate }) => {
  // MCPコンテキスト
  const mcpContext = useMCPContext();

  // サウンドシステム
  const { soundSystem } = useSoundContext();

  // 画面遷移用
  const router = useRouter();

  // ローカルタイピングモデル参照（パフォーマンス最適化用）
  const typingModelRef = useRef(null);

  // 表示情報の状態
  const [displayInfo, setDisplayInfo] = useState({
    problem: problem?.text || '',
    reading: problem?.reading || '',
    typedText: '',
    remainingText: problem?.text || '',
    cursor: 0,
    isCompleted: false,
    isError: false,
    isProcessingComplete: false
  });

  // フォーカス状態
  const [isFocused, setIsFocused] = useState(true);

  // パフォーマンス監視用
  const performanceRef = useRef({
    startTime: Date.now(),
    frameCount: 0,
    lastFpsUpdate: Date.now(),
    fps: 60,
    inputCount: 0,
    lastFrameTime: 0,
    memoryUsage: [],
    slowFrames: 0,
    // 新しいパフォーマンスメトリクス
    lastPerformanceReport: Date.now(),
    performanceReportInterval: 30000, // 30秒ごとにレポート
  });

  /**
   * 画面遷移処理
   */
  const navigateTo = useCallback((screen) => {
    if (onNavigate && typeof onNavigate === 'function') {
      onNavigate(screen);
    } else {
      router.push(`/${screen}`);
    }
  }, [onNavigate, router]);

  /**
   * 入力処理（高速化のためuseCallbackで再定義）
   */
  const processInput = useCallback((key) => {
    // パフォーマンス測定開始
    const startTime = performance.now();

    try {
      // 入力カウントを増やす（パフォーマンス測定用）
      performanceRef.current.inputCount++;

      // ローカル処理（高速パス）
      if (typingModelRef.current) {
        const result = typingModelRef.current.processLocalInput(key);

        // 入力結果に応じたサウンド再生
        if (result && result.success) {
          soundSystem.playSound('success');
        } else if (result && !result.success) {
          soundSystem.playSound('miss');
        }

        // ミス時の振動フィードバック（モバイル向け）
        if (result && !result.success && navigator.vibrate) {
          navigator.vibrate(20);
        }
      }

      // MCPへの非同期通知
      if (mcpContext.isActive) {
        // queueMicrotaskを使用してメインスレッドブロッキングを防止
        queueMicrotask(() => {
          mcpContext.recordTypingInput({
            key: key,
            isBackspace: key === 'Backspace',
            timestamp: Date.now(),
            isAnalyticsOnly: true,
            processDuration: performance.now() - startTime
          });
        });
      }
    } catch (error) {
      console.error('[MCPGameScreen] 入力処理エラー:', error);
    }
  }, [mcpContext, soundSystem]);

  /**
   * キーボード入力ハンドラ
   */
  const handleKeyDown = useCallback((e) => {
    if (!isFocused) return;

    // スペースキーのデフォルト動作を防止
    if (e.key === ' ') {
      e.preventDefault();
    }

    // Tabキーを無効化（フォーカス移動防止）
    if (e.key === 'Tab') {
      e.preventDefault();
      return;
    }

    // ESCキーでメインメニューに戻る
    if (e.key === 'Escape') {
      e.preventDefault();
      soundSystem.playSound('button');
      setTimeout(() => navigateTo('menu'), 100);
      return;
    }

    // 文字入力でなければ無視
    if (e.key.length !== 1 && e.key !== 'Backspace') {
      return;
    }

    // 高性能入力処理パス
    processInput(e.key);
  }, [isFocused, navigateTo, soundSystem, processInput]);

  /**
   * ウィンドウフォーカス処理
   */
  const handleWindowFocus = useCallback(() => {
    setIsFocused(true);
    mcpContext.recordUXElement({
      type: 'focus',
      component: 'MCPGameScreen',
      timestamp: Date.now()
    });
  }, [mcpContext]);

  /**
   * ウィンドウブラー処理
   */
  const handleWindowBlur = useCallback(() => {
    setIsFocused(false);
    mcpContext.recordUXElement({
      type: 'blur',
      component: 'MCPGameScreen',
      timestamp: Date.now()
    });
  }, [mcpContext]);

  /**
   * 問題初期化処理
   */
  useEffect(() => {
    if (!problem || !mcpContext.isActive) return;

    // 問題初期化コマンドの送信準備
    const initializeProblem = () => {
      if (typeof window === 'undefined' || !window._mcp) return;

      // 完了イベントのリスナーを設定
      const initializationListener = (data) => {
        // 初期化完了時のコールバック
        console.log('問題初期化完了:', data);

        // タイピングモデルの参照を保持（直接アクセス用）
        if (data.model) {
          typingModelRef.current = data.model;
        }

        // 表示情報の初期化
        setDisplayInfo({
          problem: problem.text,
          reading: problem.reading || '',
          typedText: '',
          remainingText: problem.text,
          cursor: 0,
          isCompleted: false,
          isError: false
        });

        // リスナー削除（メモリリーク防止）
        window._mcp?.off(TypingEvents.PROBLEM_INITIALIZED, initializationListener);
      };

      // 初期化イベントリスナーを登録
      window._mcp?.on(TypingEvents.PROBLEM_INITIALIZED, initializationListener);

      // 表示更新イベントリスナーを登録
      window._mcp?.on(TypingEvents.DISPLAY_UPDATED, handleDisplayUpdate);

      // 問題初期化コマンド送信
      window._mcp?.send(TypingCommands.INIT_PROBLEM, {
        problemId: problem.id,
        text: problem.text,
        reading: problem.reading || '',
        language: problem.language || 'ja',
        difficulty: problem.difficulty || 'normal',
        timestamp: Date.now()
      });

      // 分析用イベント記録
      mcpContext.recordGameEvent({
        type: 'problem_start',
        problemId: problem.id,
        timestamp: Date.now()
      });
    };

    // パフォーマンスモニタリングの開始
    startPerformanceMonitoring();

    // 初期化処理実行
    initializeProblem();

    // クリーンアップ関数
    return () => {
      // イベントリスナーの削除
      if (typeof window !== 'undefined' && window._mcp) {
        window._mcp.off(TypingEvents.DISPLAY_UPDATED, handleDisplayUpdate);
      }

      // パフォーマンスモニタリングを停止
      stopPerformanceMonitoring();
    };
  }, [problem, mcpContext]);

  /**
   * パフォーマンス監視を開始
   */
  const startPerformanceMonitoring = useCallback(() => {
    // パフォーマンスカウンターをリセット
    performanceRef.current = {
      startTime: Date.now(),
      frameCount: 0,
      lastFpsUpdate: Date.now(),
      fps: 60,
      inputCount: 0,
      lastFrameTime: performance.now(),
      memoryUsage: [],
      slowFrames: 0,
      lastPerformanceReport: Date.now(),
      performanceReportInterval: 30000,
    };

    // FPS計測用のRAF
    let frameId = null;
    const measureFps = () => {
      const perf = performanceRef.current;
      const now = performance.now();
      const elapsed = now - perf.lastFrameTime;

      // フレーム間時間が長すぎる場合は遅延フレームとしてカウント
      if (elapsed > 50) { // 50ms以上かかったフレームは遅い (20fps未満)
        perf.slowFrames++;
      }

      perf.lastFrameTime = now;
      perf.frameCount++;

      // 1秒ごとにFPSを更新
      if (now - perf.lastFpsUpdate > 1000) {
        // FPSを計算
        const fps = Math.round(
          (perf.frameCount * 1000) / (now - perf.lastFpsUpdate)
        );
        perf.fps = fps;
        perf.lastFpsUpdate = now;
        perf.frameCount = 0;

        // メモリ使用状況の記録（メモリ測定APIが利用可能な場合）
        if (window.performance && window.performance.memory) {
          const memory = window.performance.memory;
          perf.memoryUsage.push({
            time: now,
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
          });

          // 最大10件のメモリ記録を保持
          if (perf.memoryUsage.length > 10) {
            perf.memoryUsage.shift();
          }
        }

        // 定期的なパフォーマンスレポートの送信
        if (now - perf.lastPerformanceReport > perf.performanceReportInterval) {
          sendPerformanceReport();
          perf.lastPerformanceReport = now;
        }
      }

      // 次のフレームを計測
      frameId = requestAnimationFrame(measureFps);
    };

    // 計測を開始
    frameId = requestAnimationFrame(measureFps);

    // クリーンアップ関数を返す
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  /**
   * パフォーマンス監視を停止
   */
  const stopPerformanceMonitoring = useCallback(() => {
    // 最終的なパフォーマンスレポートを送信
    sendPerformanceReport();
  }, []);

  /**
   * パフォーマンスレポートを送信
   */
  const sendPerformanceReport = useCallback(() => {
    const perf = performanceRef.current;
    if (!mcpContext.isActive) return;

    try {
      const now = Date.now();
      const totalElapsed = now - perf.startTime;

      // パフォーマンスデータの収集
      const performanceData = {
        fps: perf.fps,
        slowFrames: perf.slowFrames,
        inputCount: perf.inputCount,
        totalElapsedMs: totalElapsed,
        timestamp: now,
        memory: perf.memoryUsage.length > 0 ? perf.memoryUsage[perf.memoryUsage.length - 1] : null
      };

      // パフォーマンスメトリクスを記録
      mcpContext.recordPerformanceMetric({
        type: 'game_performance',
        component: 'MCPGameScreen',
        data: performanceData
      });

      // MCPにも通知
      if (window._mcp) {
        window._mcp.send(TypingCommands.PERFORMANCE_REPORT, performanceData);
      }
    } catch (err) {
      console.error('パフォーマンスレポート送信エラー:', err);
    }
  }, [mcpContext]);

  /**
   * キーボード入力イベントの登録
   */
  useEffect(() => {
    if (!problem) return;

    // キーボードイベントリスナー関数を定義
    const keydownHandler = (e) => handleKeyDown(e);

    // キーボードイベントリスナー登録
    window.addEventListener('keydown', keydownHandler);

    // フォーカス関連イベントリスナー登録
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    // クリーンアップ関数
    return () => {
      window.removeEventListener('keydown', keydownHandler);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);

      // メモリリーク防止のための追加クリーンアップ
      typingModelRef.current = null;
    };
  }, [problem, handleKeyDown, handleWindowFocus, handleWindowBlur]);

  /**
   * 表示情報更新ハンドラ
   */
  const handleDisplayUpdate = useCallback((data) => {
    const { displayInfo: newInfo } = data || {};
    if (!newInfo) return;

    // 表示情報の更新（必要な場合のみ）
    setDisplayInfo(prevInfo => {
      // 内容が同じなら更新しない（再レンダリング最適化）
      if (JSON.stringify(prevInfo) === JSON.stringify(newInfo)) {
        return prevInfo;
      }
      return newInfo;
    });

    // 問題完了時の処理
    if (newInfo.isCompleted && !newInfo.isProcessingComplete) {
      // 二重処理防止
      setDisplayInfo(prev => ({ ...prev, isProcessingComplete: true }));

      // 完了音再生
      soundSystem.playSound('complete');

      // 最終パフォーマンスレポートを送信
      sendPerformanceReport();

      // 完了コマンド送信と結果処理
      setTimeout(() => {
        if (window._mcp) {
          // 完了イベント監視
          const completedListener = (completedData) => {
            // 問題完了処理実行
            if (onProblemComplete && typeof onProblemComplete === 'function') {
              onProblemComplete({
                problem: problem,
                stats: completedData.stats
              });
            }

            // リスナー削除
            window._mcp.off(TypingEvents.PROBLEM_COMPLETED, completedListener);
          };

          // 完了イベントリスナー登録
          window._mcp.on(TypingEvents.PROBLEM_COMPLETED, completedListener);

          // 完了コマンド送信
          window._mcp.send(TypingCommands.COMPLETE_PROBLEM, {
            problemId: problem?.id,
            timestamp: Date.now()
          });
        }
      }, 300);
    }

    // エラー時のサウンド効果
    if (newInfo.isError) {
      soundSystem.playSound('miss');
    }
  }, [problem, soundSystem, onProblemComplete, sendPerformanceReport]);

  /**
   * レンダリング
   */
  return (
    <div className={styles.gameScreen} tabIndex={0}>
      <div className={styles.gameHeader}>
        <h2>タイピングゲーム</h2>
        <button
          onClick={() => navigateTo('menu')}
          className={styles.backButton}
        >
          メニューに戻る
        </button>

        {/* パフォーマンス表示（開発モードのみ表示） */}
        {process.env.NODE_ENV === 'development' && (
          <div className={styles.performanceInfo}>
            FPS: {performanceRef.current.fps}
          </div>
        )}
      </div>

      <div className={styles.gameContent}>
        {/* 問題表示コンポーネント */}
        <TypingDisplay
          displayInfo={displayInfo}
          errorAnimation={displayInfo.isError}
        />

        {/* 進捗バー */}
        <TypingProgress
          percentage={displayInfo.progressPercentage || 0}
        />

        {/* 統計情報表示 */}
        <TypingStats
          stats={displayInfo.stats || {
            correctCount: 0,
            missCount: 0,
            kpm: 0,
            accuracy: 100
          }}
        />
      </div>

      {/* フォーカス注意喚起（フォーカスが外れた場合のみ表示） */}
      {!isFocused && (
        <div className={styles.focusWarning}>
          ウィンドウをクリックしてください
        </div>
      )}
    </div>
  );
};

export default MCPGameScreen;