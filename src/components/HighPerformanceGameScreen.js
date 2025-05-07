/**
 * HighPerformanceGameScreen.js
 * 高性能タイピングゲーム画面コンポーネント
 * Web WorkerとMCPを活用した最適化版タイピング画面
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHighPerformanceTyping } from '../hooks/useHighPerformanceTyping';
import { useGameContext } from '../contexts/GameContext';
import { useSoundContext } from '../contexts/SoundContext';
import styles from '../styles/GameScreen.module.css';
import ComboEffectUtils from '../utils/ComboEffectUtils';
import mcpUtils from '../utils/MCPUtils';

/**
 * 高性能タイピングゲーム画面コンポーネント
 * パフォーマンスを最大化したタイピングゲーム画面
 */
const HighPerformanceGameScreen = () => {
  // ゲームコンテキスト
  const {
    gameState,
    currentProblem,
    setGameScreen,
    setResult,
    problemSet,
    currentProblemIndex,
    setCurrentProblemIndex
  } = useGameContext();

  // サウンドコンテキスト
  const { isSoundEnabled } = useSoundContext();

  // パフォーマンス測定
  const [perfStats, setPerfStats] = useState({
    fps: 0,
    responseTime: 0,
    cacheHitRate: 0
  });

  // コンボ状態
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [showComboEffect, setShowComboEffect] = useState(false);

  // MCP統計情報（分析用）
  const mcpContextRef = useRef(null);

  // コンボエフェクトタイマー
  const comboEffectTimerRef = useRef(null);

  // 最終問題チェックフラグ
  const isLastProblem = currentProblemIndex === problemSet.length - 1;

  // 残り時間表示
  const [timeDisplay, setTimeDisplay] = useState('00:00');

  // 高性能タイピングフックを使用
  const typingGame = useHighPerformanceTyping({
    initialProblem: currentProblem,
    playSound: isSoundEnabled,
    onProblemComplete: handleProblemComplete
  });

  // MCPコンテキスト初期化
  useEffect(() => {
    mcpContextRef.current = mcpUtils.useMCPContext ? mcpUtils.useMCPContext() : null;

    // パフォーマンス情報の記録タイマー（デバッグ用）
    const perfTimer = setInterval(() => {
      if (typingGame.getPerfMetrics) {
        typingGame.getPerfMetrics().then(metrics => {
          const fps = metrics.client.frameRate || 0;
          const cacheHitRate = metrics.worker?.local?.cacheRatio || 0;
          const responseTime = metrics.worker?.local?.avgProcessingTime || 0;

          setPerfStats({
            fps,
            responseTime: Math.round(responseTime * 100) / 100,
            cacheHitRate: Math.round(cacheHitRate * 100) / 100
          });

          // MCP統計情報送信（分析用）
          if (mcpContextRef.current?.recordPerformanceMetric) {
            mcpContextRef.current.recordPerformanceMetric({
              type: 'typingPerformance',
              fps,
              responseTime,
              cacheHitRate,
              timestamp: Date.now()
            });
          }
        });
      }
    }, 5000);

    return () => clearInterval(perfTimer);
  }, []);

  // 経過時間の更新
  useEffect(() => {
    const timer = setInterval(() => {
      const seconds = Math.floor(typingGame.stats.elapsedTimeSeconds % 60);
      const minutes = Math.floor(typingGame.stats.elapsedTimeSeconds / 60);

      setTimeDisplay(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [typingGame.stats.elapsedTimeSeconds]);

  // コンボの更新
  useEffect(() => {
    // コンボ計算（前回の正解数との差分）
    const prevCombo = combo;
    const newCombo = calculateCombo();

    if (newCombo > prevCombo) {
      // コンボ数更新
      setCombo(newCombo);

      // 最大コンボ更新
      if (newCombo > maxCombo) {
        setMaxCombo(newCombo);
      }

      // コンボエフェクト表示（5の倍数のコンボでエフェクト）
      if (newCombo % 5 === 0 && newCombo > 0) {
        if (comboEffectTimerRef.current) {
          clearTimeout(comboEffectTimerRef.current);
        }

        setShowComboEffect(true);
        comboEffectTimerRef.current = setTimeout(() => {
          setShowComboEffect(false);
        }, 1500);
      }
    } else if (newCombo === 0 && prevCombo > 0) {
      // コンボ切れ
      setCombo(0);
    }
  }, [typingGame.stats.correctKeyCount, typingGame.errorAnimation]);

  /**
   * コンボ数を計算
   */
  function calculateCombo() {
    // 直前のミスでコンボリセット
    if (typingGame.errorAnimation) {
      return 0;
    }

    // キーカウントからコンボ計算
    return Math.floor(typingGame.stats.correctKeyCount / 5);
  }

  /**
   * 問題完了時の処理
   */
  function handleProblemComplete(problemStats) {
    // 問題統計情報
    const stats = {
      ...typingGame.stats,
      problemStats: problemStats,
      maxCombo: maxCombo,
    };

    // 最終問題の場合は結果画面へ
    if (isLastProblem) {
      setResult({
        kpm: stats.kpm,
        accuracy: stats.accuracy,
        rank: stats.rank,
        maxCombo: maxCombo,
        elapsedTime: stats.elapsedTimeSeconds,
        problemStats: [problemStats]
      });

      setGameScreen('result');
    } else {
      // 次の問題へ
      const nextIndex = currentProblemIndex + 1;
      setCurrentProblemIndex(nextIndex);

      // 次の問題を初期化
      const nextProblem = problemSet[nextIndex];
      if (nextProblem) {
        // 少し遅延して初期化（アニメーション用）
        setTimeout(() => {
          typingGame.initializeSession(nextProblem);
        }, 500);
      }
    }
  }

  /**
   * キーボード入力のイベントハンドラ
   */
  const handleKeyDown = useCallback((e) => {
    // IME確定中は処理しない
    if (e.isComposing) return;

    // 特殊キーは無視
    if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;

    // タイピング処理を行う
    typingGame.handleInput(e.key);
  }, [typingGame]);

  // キーボードイベントの登録
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className={styles.gameContainer}>
      <div className={styles.gameHeader}>
        <div className={styles.problemInfo}>
          <div className={styles.problemCount}>
            問題 {currentProblemIndex + 1} / {problemSet.length}
          </div>
          <div className={styles.timeDisplay}>{timeDisplay}</div>
        </div>

        <div className={styles.statsDisplay}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>キー速度:</span>
            <span className={styles.statValue}>{typingGame.stats.kpm} KPM</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>正確さ:</span>
            <span className={styles.statValue}>{typingGame.stats.accuracy}%</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>ランク:</span>
            <span
              className={styles.rankValue}
              style={{
                color: getRankColor(typingGame.stats.rank),
                textShadow: `0 0 5px ${getRankColor(typingGame.stats.rank)}80`
              }}
            >
              {typingGame.stats.rank}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.problemDisplay}>
        <div className={styles.japaneseText}>{currentProblem.displayText}</div>
      </div>

      <div className={`${styles.typingArea} ${typingGame.errorAnimation ? styles.errorShake : ''}`}>
        <div className={styles.romajiText}>
          {/* 入力済み部分 */}
          <span className={styles.typedText}>
            {typingGame.romaji.substring(0, typingGame.typedLength)}
          </span>

          {/* 現在入力中の文字 */}
          <span className={styles.currentChar}>
            {typingGame.romaji.substring(
              typingGame.typedLength,
              typingGame.typedLength + (typingGame.currentCharRomaji?.length || 1)
            )}
          </span>

          {/* 未入力部分 */}
          <span className={styles.untyped}>
            {typingGame.romaji.substring(
              typingGame.typedLength + (typingGame.currentCharRomaji?.length || 1)
            )}
          </span>
        </div>

        <div className={styles.inputGuide}>
          次の入力: <span className={styles.nextKey}>{typingGame.nextChar || '-'}</span>
        </div>
      </div>

      {/* コンボ表示 */}
      <div className={styles.comboArea}>
        <div className={styles.comboCounter}>
          <span className={styles.comboLabel}>COMBO</span>
          <span className={styles.comboValue}>{combo}</span>
        </div>

        {/* コンボエフェクト */}
        {showComboEffect && (
          <div className={styles.comboEffect} style={ComboEffectUtils.getComboStyle(combo)}>
            {combo} COMBO!
          </div>
        )}
      </div>

      {/* パフォーマンス指標（開発モード時のみ表示） */}
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.perfStats}>
          <div>FPS: {perfStats.fps}</div>
          <div>応答時間: {perfStats.responseTime}ms</div>
          <div>キャッシュヒット率: {(perfStats.cacheHitRate * 100).toFixed(1)}%</div>
          <div>高性能モード: 有効</div>
        </div>
      )}
    </div>
  );
};

/**
 * ランクに対応する色を返す
 */
const getRankColor = (rank) => {
  switch (rank) {
    case 'S': return '#00ff66';  // 緑
    case 'A': return '#33ff00';  // 黄緑
    case 'B': return '#ffff00';  // 黄色
    case 'C': return '#ff9900';  // オレンジ
    case 'D': return '#ff3300';  // 赤橙
    case 'E': return '#ff0000';  // 赤
    case 'F': return '#cc0000';  // 暗い赤
    default: return '#ffffff';  // 白
  }
};

export default HighPerformanceGameScreen;