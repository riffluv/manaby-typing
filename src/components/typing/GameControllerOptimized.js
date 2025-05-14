'use client';

/**
 * GameControllerOptimized.js
 * 最適化されたゲームコントローラーコンポーネント
 * パフォーマンスを最大限に引き出すための実装
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTypingGameOptimized } from '@/hooks/useTypingGameOptimized';
import { useGameContext } from '@/contexts/GameContext';
import { SCREENS } from '@/contexts/GameContext';
import TypingUtils from '@/utils/TypingUtils';
import soundSystem from '@/utils/SoundUtils';
import typingWorkerManager from '@/utils/TypingWorkerManager';
import scoreWorkerManager from '@/utils/ScoreWorkerManager';

// 定数
const DEFAULT_DEBUG_DATA = {
  lastKeyPressTime: 0,
  inputLatency: 0,
};

/**
 * 最適化されたゲームコントローラーフック
 * @param {Object} options 設定オプション
 * @returns {Object} ゲームコントローラーのAPIと状態
 */
export function useGameControllerOptimized(options = {}) {
  const {
    initialScreen = SCREENS.MAIN_MENU,
    onLastPressedKeyChange = null,
    onDebugInfoUpdate = null,
  } = options;

  // ゲーム状態
  const [gameState, setGameStateInternal] = useState({
    screen: initialScreen,
    problem: null,
    solvedCount: 0,
    level: 1,
    gameStartTime: null,
    lastCorrectTime: null,
    stats: {
      kpm: 0,
      correctCount: 0,
      missCount: 0,
      accuracy: 0,
      rank: 'F',
      problemKPMs: [],
      elapsedTimeMs: 0,
    },
  });

  // 現在の問題
  const [currentProblem, setCurrentProblem] = useState(null);

  // パフォーマンスメトリクス - 参照で管理（再レンダリング防止）
  const performanceRef = useRef({
    ...DEFAULT_DEBUG_DATA
  });

  // Game Contextから状態更新関数を取得
  const { setGameState } = useGameContext();

  // 最適化されたタイピングゲーム
  const typing = useTypingGameOptimized({
    initialProblem: currentProblem,
    playSound: true,
    soundSystem,
    onProblemComplete: handleProblemComplete,
    onDebugInfoUpdate,
  });

  /**
   * 問題が完了した時の処理
   */
  function handleProblemComplete(typingStats) {    // 効果音再生
    soundSystem.playSound('clear');

    // 次の問題数を計算
    const newSolvedCount = gameState.solvedCount + 1;

    // 累積パフォーマンス計測
    const elapsedTimeMs = gameState.gameStartTime
      ? Date.now() - gameState.gameStartTime
      : 0;
      
    // 最後のお題のキー入力状況
    const lastProblemCorrectKeys = typing?.typingStats?.statsRef?.current?.correctKeyCount || 0;
    const lastProblemMissKeys = typing?.typingStats?.statsRef?.current?.mistakeCount || 0;

    // 累積入力数の計算（全問題の累積）
    const totalCorrectKeyCount = (gameState.stats?.correctCount || 0) + lastProblemCorrectKeys;
    const totalMissCount = (gameState.stats?.missCount || 0) + lastProblemMissKeys;
    
    // 問題ごとのKPM履歴を更新
    const allProblemKPMs = [
      ...(gameState.stats?.problemKPMs || []),
      typingStats?.problemKPM || 0,
      typing?.typingStats?.displayStats?.kpm || 0
    ].filter(kpm => kpm > 0);

    // スコア計算を非同期でWorkerに依頼
    // これによりUIスレッドをブロックせずに計算処理を行う
    const statsData = {
      problemStats: allProblemKPMs.map(kpm => ({ problemKPM: kpm })),
      correctKeyCount: totalCorrectKeyCount,
      mistakeCount: totalMissCount,
      elapsedTimeMs: elapsedTimeMs
    };
    
    // Worker経由で計算処理を実行（メインスレッドをブロックしない）
    scoreWorkerManager.calculateStats(statsData)
      .then(result => {
        // 計算結果を受け取ったらステートを更新
        const updatedGameState = {
          ...gameState,
          solvedCount: newSolvedCount,
          lastCorrectTime: Date.now(),
          stats: {
            kpm: result.averageKPM, // Workerで計算された平均KPM
            correctCount: totalCorrectKeyCount,
            missCount: totalMissCount,
            accuracy: result.accuracy, // Workerで計算された精度
            rank: result.rank, // Workerで計算されたランク
            problemKPMs: allProblemKPMs,
            elapsedTimeMs: elapsedTimeMs,
            totalTime: elapsedTimeMs / 1000,
          }
        };
        
        // 非同期で状態を更新
        setGameStateInternal(updatedGameState);
        setGameState(updatedGameState);
      })
      .catch(error => {
        // エラー発生時はフォールバック処理（同期的に計算）
        console.error('スコア計算エラー:', error);
        
        // 同期的な計算処理（フォールバック）
        let averageKPM = 0;
        if (allProblemKPMs && allProblemKPMs.length > 0) {
          averageKPM = allProblemKPMs.reduce((sum, kpm) => sum + kpm, 0) / allProblemKPMs.length;
        } else {
          averageKPM = Math.floor(totalCorrectKeyCount / (elapsedTimeMs / 60000 || 1));
        }

        // 精度の計算
        const totalKeyPresses = totalCorrectKeyCount + totalMissCount;
        const accuracy = totalKeyPresses > 0
          ? Math.round((totalCorrectKeyCount / totalKeyPresses) * 1000) / 10
          : 100;
          
        // フォールバック用のゲーム状態
        const fallbackGameState = {
          ...gameState,
          solvedCount: newSolvedCount,
          lastCorrectTime: Date.now(),
          stats: {
            kpm: Math.round(averageKPM * 10) / 10,
            correctCount: totalCorrectKeyCount,
            missCount: totalMissCount,
            accuracy: accuracy,
            rank: TypingUtils.getRank(averageKPM) || 'F',
            problemKPMs: allProblemKPMs,
            elapsedTimeMs: elapsedTimeMs,
            totalTime: elapsedTimeMs / 1000,
          }
        };
        
        setGameStateInternal(fallbackGameState);        setGameState(fallbackGameState);
      });
      
    // 一時的な状態を先に更新して、UIの応答性を維持
    const temporaryGameState = {
      ...gameState,
      solvedCount: newSolvedCount,
      lastCorrectTime: Date.now(),
    };

    // 一時的な状態を先に更新
    setGameStateInternal(temporaryGameState);

    // 次の問題に進む（問題生成処理は別途呼び出し）
    const nextProblem = generateNextProblem(newSolvedCount);
    setCurrentProblem(nextProblem);

    // パフォーマンス測定のリセット
    performanceRef.current = { ...DEFAULT_DEBUG_DATA };

    // フィードバックを実行するために少し待機
    setTimeout(() => {
      // 3問以上解いたら結果画面へ
      if (newSolvedCount >= 3) {
        goToScreen(SCREENS.RESULT, null, false);
        return;
      }

      // タイピングオブジェクトが存在し、setProblemメソッドがある場合は問題を設定
      if (typing && typing.setProblem) {
        console.log('[GameControllerOptimized] 次の問題をタイピングセッションに設定します');
        typing.setProblem(nextProblem);
      } else {
        console.warn('[GameControllerOptimized] タイピングオブジェクトまたはsetProblem関数がありません');
      }
    }, 50); // 0.05秒のわずかなディレイ
  }

  /**
   * 画面遷移処理
   */
  const goToScreen = useCallback((screen, options = {}, updateState = true) => {
    const { playSound = false, soundType = 'click' } = options;

    if (playSound) {
      soundSystem.playSound(soundType);
    }

    // 画面によって初期化処理を変更
    if (screen === SCREENS.GAME) {
      // ゲーム開始時の初期化
      const firstProblem = generateInitialProblem();
      
      const newGameState = {
        ...gameState,
        screen,
        solvedCount: 0,
        gameStartTime: Date.now(),
        lastCorrectTime: null,
        stats: {
          kpm: 0,
          correctCount: 0,
          missCount: 0,
          accuracy: 0,
          rank: 'F',
          problemKPMs: [],
          elapsedTimeMs: 0,
        }
      };

      // 状態を更新
      if (updateState) {
        setGameStateInternal(newGameState);
        setGameState(newGameState);
        setCurrentProblem(firstProblem);
      }

      return;
    }

    // その他の画面への遷移
    if (updateState) {
      setGameStateInternal(prev => ({ ...prev, screen }));
      setGameState(prev => ({ ...prev, screen }));
    }
  }, [gameState, setGameState]);

  /**
   * 初期問題の生成
   */
  const generateInitialProblem = useCallback(() => {
    const problem = {
      id: 'initial',
      level: 1,
      displayText: 'はじめてのタイピング',
      kanaText: 'はじめてのたいぴんぐ'
    };

    return problem;
  }, []);

  /**
   * 次の問題の生成
   */
  const generateNextProblem = useCallback((solvedCount) => {
    const level = Math.min(5, Math.floor(solvedCount / 3) + 1);
    
    const problems = [
      { id: 'p1', displayText: 'タイピングゲーム', kanaText: 'たいぴんぐげーむ' },
      { id: 'p2', displayText: '早く正確に', kanaText: 'はやくせいかくに' },
      { id: 'p3', displayText: 'パフォーマンス最適化', kanaText: 'ぱふぉーまんすさいてきか' },
      { id: 'p4', displayText: '日本語入力', kanaText: 'にほんごにゅうりょく' },
      { id: 'p5', displayText: '高速レスポンス', kanaText: 'こうそくれすぽんす' }
    ];

    const index = solvedCount % problems.length;
    return {
      ...problems[index],
      level
    };
  }, []);

  /**
   * キーボードイベントハンドラ
   */
  const handleKeyDown = useCallback((e) => {
    // Escキーでメニューに戻る
    if (e.key === 'Escape') {
      goToScreen(SCREENS.MAIN_MENU, {
        playSound: true,
        soundType: 'button',
      });
      return;
    }

    // タイピングセッションがなければ何もしない
    if (!typing.typingSession) return;

    // パフォーマンス計測開始
    const startTime = performance.now();

    // 入力処理
    const result = typing.handleInput(e.key);

    // パフォーマンス計測終了と記録
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    performanceRef.current.inputLatency = processingTime;
    performanceRef.current.lastKeyPressTime = Date.now();

    // 入力されたキーを通知
    if (onLastPressedKeyChange) {
      onLastPressedKeyChange(e.key);
    }

    // デバッグ情報の更新
    if (typing.performanceMetrics) {
      typing.performanceMetrics.inputLatency = processingTime;
    }

    // キー入力イベントの伝播を止める
    if (result && result.success) {
      e.preventDefault();
    }
  }, [typing, goToScreen, onLastPressedKeyChange]);

  /**
   * 次に入力すべきキーを取得
   */
  const getNextKey = useCallback(() => {
    return typing?.typingSession?.getCurrentExpectedKey() || '';
  }, [typing]);

  /**
   * キーイベントリスナーの設定
   */
  useEffect(() => {
    // ゲーム画面のときのみキーボードイベントを有効にする
    if (gameState.screen === SCREENS.GAME) {
      document.addEventListener('keydown', handleKeyDown);

      // 問題が設定されていない場合は初期問題を設定
      if (!currentProblem) {
        const initialProblem = generateInitialProblem();
        setCurrentProblem(initialProblem);
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState.screen, handleKeyDown, currentProblem, generateInitialProblem]);

  // ゲームコントローラーAPIを返す
  return {
    // 状態
    gameState,
    currentProblem,
    typing,
    performanceMetrics: performanceRef.current,

    // メソッド
    goToScreen,
    getNextKey,

    // 直接参照（必要に応じて）
    typingRef: {
      current: typing
    },
  };
}

/**
 * Workerクリーンアップ
 * コンポーネントのアンマウント時にWorkerを適切に終了
 */
export function cleanupTypingWorker() {
  // タイピングWorkerのクリーンアップ
  typingWorkerManager.cleanup();
  
  // スコア計算Workerのクリーンアップ
  if (typeof window !== 'undefined' && window.scoreWorkerManager) {
    window.scoreWorkerManager.cleanup();
  }
}