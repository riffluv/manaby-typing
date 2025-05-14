'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameContext } from '../contexts/GameContext';
import { useSoundContext } from '../contexts/SoundContext';
// ToastContextのインポートを削除
import useMCPTypingGame from '../hooks/typing/useMCPTypingGame';
import { getRandomizedProblems, DIFFICULTIES } from '../utils/ProblemData'; // getRandomProblemをgetRandomizedProblemsに修正
import gameStyles from '../styles/GameScreen.module.css';
import mcpUtils from '../utils/MCPUtils';
import MCPFeedbackDisplay from './typing/MCPFeedbackDisplay';
import { TypingEvents, TypingCommands } from '../utils/mcp/TypingProtocol';
import { getTypingModelInstance } from '../utils/mcp/TypingModelMCP';

/**
 * MCPアーキテクチャを使用したタイピングゲーム画面
 * Model-Controller-Presentation アーキテクチャに基づいて実装
 */
const MCPGameScreen = () => {
  // コンテキスト
  const { navigateTo, updateGameStats } = useGameContext();
  const { soundSystem } = useSoundContext(); // soundSystemのみ取得するように修正
  // ToastContext使用の代わりに、簡易的なトースト表示を実装
  const [toast, setToast] = useState({ message: '', visible: false });

  // 状態
  // getRandomProblem関数はないので、代わりにgetRandomizedProblemsを使用し、最初の問題を取得
  const [problem, setProblem] = useState(() => {
    const problems = getRandomizedProblems(DIFFICULTIES.NORMAL, 1);
    return problems?.[0] || null;
  });

  const [isFocused, setIsFocused] = useState(true);
  const [solvedCount, setSolvedCount] = useState(0);
  const [problemHistory, setProblemHistory] = useState([]);
  const [showFeedback, setShowFeedback] = useState(true);
  const [feedbackPosition, setFeedbackPosition] = useState('right');

  // 簡易トースト表示関数
  const showToast = useCallback((message) => {
    setToast({ message, visible: true });

    // 3秒後に非表示
    setTimeout(() => {
      setToast(prevToast => ({ ...prevToast, visible: false }));
    }, 3000);
  }, []);

  // MCP関連の状態
  const [displayInfo, setDisplayInfo] = useState({
    romaji: '',
    typedLength: 0,
    nextChar: '',
    currentInput: '',
    currentCharRomaji: '',
    inputMode: 'normal',
    isError: false,
    isCompleted: false
  });
  const [stats, setStats] = useState({
    correctKeyCount: 0,
    mistakeCount: 0,
    elapsedTimeSeconds: 0,
    kpm: 0,
    accuracy: 100,
    rank: 'F'
  });
  const [isModelReady, setIsModelReady] = useState(false);

  // MCPタイピングモデルの参照
  const typingModelRef = useRef(null);

  // MCPコンテキスト
  const mcpContext = mcpUtils.useMCPContext();

  // リファレンス
  const inputRef = useRef(null);

  // MCPタイピングモデルの初期化
  useEffect(() => {
    async function initializeTypingModel() {
      try {
        // MCPが利用可能かチェック
        if (typeof window === 'undefined' || !window._mcp) {
          console.warn('[MCPGameScreen] MCPが利用できないため、標準モードで実行します');
          return;
        }

        // タイピングモデルの取得
        const typingModel = getTypingModelInstance();
        if (!typingModel) {
          throw new Error('タイピングモデルの取得に失敗しました');
        }

        // 参照に保存
        typingModelRef.current = typingModel;

        // イベントリスナーの登録
        const displayUpdatedUnsubscribe = typingModel.addEventListener(
          TypingEvents.DISPLAY_UPDATED,
          handleDisplayUpdate
        );

        const statsUpdatedUnsubscribe = typingModel.addEventListener(
          TypingEvents.STATS_UPDATED,
          handleStatsUpdate
        );

        const errorUnsubscribe = typingModel.addEventListener(
          TypingEvents.ERROR,
          handleModelError
        );

        // 問題の初期化
        const initResult = await initializeProblem(problem);
        if (initResult && initResult.success) {
          setIsModelReady(true);
          console.log('[MCPGameScreen] タイピングモデルを初期化しました');
        }

        // クリーンアップ
        return () => {
          displayUpdatedUnsubscribe();
          statsUpdatedUnsubscribe();
          errorUnsubscribe();
        };
      } catch (error) {
        console.error('[MCPGameScreen] タイピングモデル初期化エラー:', error);
        showToast('タイピングモデルの初期化に失敗しました。標準モードで実行します。');
      }
    }

    initializeTypingModel();
  }, [problem, showToast]);

  /**
   * 表示情報更新ハンドラ
   */
  const handleDisplayUpdate = useCallback((data) => {
    const { displayInfo } = data || {};
    if (displayInfo) {
      setDisplayInfo(displayInfo);

      // 完了状態の場合
      if (displayInfo.isCompleted && !displayInfo.isProcessingComplete) {
        // 完了処理中フラグを設定し、二重処理を防止
        setDisplayInfo(prev => ({ ...prev, isProcessingComplete: true }));

        // 音を再生
        soundSystem.playSound('success');

        // 完了コマンドを送信
        if (typingModelRef.current) {
          setTimeout(() => {
            window._mcp.send(TypingCommands.COMPLETE_PROBLEM);

            // 完了イベントを監視して問題完了処理を実行
            const completedListener = (completedData) => {
              handleProblemComplete({
                problem: problem,
                stats: completedData.stats
              });

              // リスナーを削除
              if (window._mcp) {
                window._mcp.off(TypingEvents.PROBLEM_COMPLETED, completedListener);
              }
            };

            // 完了イベントリスナーを登録
            if (window._mcp) {
              window._mcp.on(TypingEvents.PROBLEM_COMPLETED, completedListener);
            }
          }, 300);
        }
      }

      // エラー状態の場合
      if (displayInfo.isError) {
        // 効果音を再生
        soundSystem.playSound('miss');
      }
    }
  }, [problem, soundSystem]);

  /**
   * 統計情報更新ハンドラ
   */
  const handleStatsUpdate = useCallback((data) => {
    const { stats } = data || {};
    if (stats) {
      setStats(stats);
    }
  }, []);

  /**
   * エラーハンドラ
   */
  const handleModelError = useCallback((data) => {
    const { message } = data || {};
    console.error('[MCPGameScreen] モデルエラー:', message);
    showToast('エラーが発生しました: ' + message);
  }, [showToast]);

  /**
   * 問題を初期化する
   */
  const initializeProblem = useCallback(async (problemData) => {
    if (!typingModelRef.current || !window._mcp) return null;

    try {
      // 問題を読み込む
      return window._mcp.send(TypingCommands.LOAD_PROBLEM, { problem: problemData });
    } catch (error) {
      console.error('[MCPGameScreen] 問題初期化エラー:', error);
      return null;
    }
  }, []);

  // 次のランダムな問題を取得する関数
  const getNextProblem = useCallback(() => {
    const problems = getRandomizedProblems(DIFFICULTIES.NORMAL, 1);
    return problems?.[0] || null;
  }, []);

  /**
   * 問題完了時の処理
   * @param {Object} data - 問題完了データ
   */
  function handleProblemComplete(data) {
    // 解いた問題数を更新
    const newSolvedCount = solvedCount + 1;
    setSolvedCount(newSolvedCount);

    // 問題履歴に追加
    setProblemHistory(prev => [...prev, {
      problem: data.problem,
      stats: data.stats
    }]);

    // MCPにゲームイベントを記録
    if (mcpContext.isActive) {
      mcpContext.recordGameEvent('problem_complete', {
        problemId: data.problem.id,
        stats: data.stats,
        solvedCount: newSolvedCount
      });
    }

    // 次の問題を設定
    const nextProblem = getNextProblem();
    setProblem(nextProblem);

    // MCPモデルで新しい問題を初期化
    if (typingModelRef.current && window._mcp) {
      window._mcp.send(TypingCommands.LOAD_PROBLEM, { problem: nextProblem });
    }

    // トースト表示
    showToast(`問題クリア！ スコア: ${data.stats.score || 0} (${data.stats.rank}ランク)`);

    // ゲーム終了条件の確認
    if (newSolvedCount >= 5) {
      // ゲーム結果をContextに保存
      updateGameStats({
        solvedCount: newSolvedCount,
        problemHistory: [...problemHistory, {
          problem: data.problem,
          stats: data.stats
        }],
        lastStats: data.stats,
        totalScore: [...problemHistory, {
          problem: data.problem,
          stats: data.stats
        }].reduce((sum, item) => sum + (item.stats.score || 0), 0),
        avgAccuracy: [...problemHistory, {
          problem: data.problem,
          stats: data.stats
        }].reduce((sum, item) => sum + item.stats.accuracy, 0) / newSolvedCount,
        avgKpm: [...problemHistory, {
          problem: data.problem,
          stats: data.stats
        }].reduce((sum, item) => sum + item.stats.kpm, 0) / newSolvedCount,
      });

      // 結果画面へ遷移
      setTimeout(() => {
        soundSystem.stopBgm(); // stopBGMも同様に修正
        navigateTo('result');
      }, 1500);
    }
  }

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

    // MCPモデルに入力を渡す
    if (typingModelRef.current && window._mcp && isModelReady) {
      try {
        // 入力処理とフィードバックを即座に反映
        const result = window._mcp.send(TypingCommands.PROCESS_INPUT, { key: e.key });

        // 正解/不正解に応じた効果音を再生
        if (result && typeof result.isCorrect === 'boolean') {
          if (result.isCorrect) {
            soundSystem.playSound('success');
          } else {
            soundSystem.playSound('error');
          }
        }
      } catch (error) {
        console.error('[MCPGameScreen] 入力処理エラー:', error);
      }
    }

    // MCPにタイピング入力を記録
    if (mcpContext.isActive) {
      mcpContext.recordTypingInput({
        key: e.key,
        isBackspace: e.key === 'Backspace',
        timestamp: Date.now()
      });
    }
  }, [isFocused, mcpContext, isModelReady, soundSystem, navigateTo]);

  /**
   * タブフォーカス変更ハンドラ
   */
  const handleVisibilityChange = useCallback(() => {
    setIsFocused(!document.hidden);
  }, []);

  /**
   * フィードバック設定の切り替え
   */
  const toggleFeedback = useCallback(() => {
    setShowFeedback(prev => !prev);
  }, []);

  /**
   * フィードバック位置の変更
   */
  const cycleFeedbackPosition = useCallback(() => {
    setFeedbackPosition(prev => {
      const positions = ['right', 'left', 'top', 'bottom'];
      const currentIndex = positions.indexOf(prev);
      const nextIndex = (currentIndex + 1) % positions.length;
      return positions[nextIndex];
    });
  }, []);

  /**
   * マウント時の処理
   */
  useEffect(() => {
    // BGM再生 - soundSystemを使用する形式に修正
    soundSystem.playBgm('game');

    // 画面内ダミーinputフォーカス
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // キーボードイベントリスナー登録
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 設定キーの登録
    const handleSettingKeys = (e) => {
      // F1キー: フィードバック表示切替
      if (e.key === 'F1') {
        e.preventDefault();
        toggleFeedback();
      }
      // F2キー: フィードバック位置切替
      else if (e.key === 'F2') {
        e.preventDefault();
        cycleFeedbackPosition();
      }
    };

    window.addEventListener('keydown', handleSettingKeys);

    // コンポーネントのマウントをMCPに記録
    if (mcpContext.isActive) {
      mcpContext.recordGameEvent('game_start', {
        currentScreen: 'mcp_game',
        mode: 'mcp',
        timestamp: Date.now()
      });
    }

    // クリーンアップ
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleSettingKeys);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      soundSystem.stopBgm(); // stopBGMも同様に修正
    };
  }, [soundSystem, handleKeyDown, handleVisibilityChange, mcpContext, toggleFeedback, cycleFeedbackPosition]);

  // 進行状況（プログレスバー用）
  const progress = problem && displayInfo ?
    (displayInfo.typedLength / problem.kanaText.length) * 100 : 0;

  // 子音入力モード判定
  const isConsonantInput = displayInfo.inputMode === 'consonant';

  // 描画を最適化するためのメモ化計算
  const remainingText = problem?.kanaText?.substring(displayInfo.typedLength) || '';
  const nextChar = remainingText.charAt(0) || '';
  const restChars = remainingText.substring(1) || '';

  return (
    <div className={gameStyles.gameScreen}>
      <div className={gameStyles.gameHeader}>
        <div className={gameStyles.gameTitle}>
          MCP タイピングゲーム
          <span className={gameStyles.gameMode}>Model-Controller-Presentation</span>
        </div>
        <div className={gameStyles.gameStats}>
          <div className={gameStyles.statItem}>
            <span className={gameStyles.statLabel}>問題数:</span>
            <span className={gameStyles.statValue}>{solvedCount} / 5</span>
          </div>
          <div className={gameStyles.statItem}>
            <span className={gameStyles.statLabel}>KPM:</span>
            <span className={gameStyles.statValue}>{stats.kpm}</span>
          </div>
          <div className={gameStyles.statItem}>
            <span className={gameStyles.statLabel}>正確率:</span>
            <span className={gameStyles.statValue}>{stats.accuracy}%</span>
          </div>
        </div>
      </div>

      <div className={gameStyles.gameArea}>
        {/* 問題表示エリア */}
        <div className={gameStyles.problem}>
          <div className={gameStyles.problemTitle}>
            {problem?.title || '問題読み込み中...'}
          </div>
          <div className={gameStyles.problemText}>
            {problem?.text || ''}
          </div>
        </div>

        {/* タイピングエリア */}
        <div className={gameStyles.typingArea}>
          <div className={gameStyles.progressBar}>
            <div
              className={gameStyles.progressFill}
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className={`${gameStyles.typingText} ${displayInfo.isError ? gameStyles.errorShake : ''}`}>
            {/* 日本語文字表示 */}
            <div className={gameStyles.kanaDisplay}>
              {/* タイプした部分（正解） */}
              <span className={gameStyles.typedText}>
                {problem?.kanaText?.substring(0, displayInfo.typedLength)}
              </span>

              {/* 次にタイプすべき文字 */}
              <span className={`${gameStyles.currentChar} ${isConsonantInput ? gameStyles.consonantInput : ''}`}>
                {nextChar}
              </span>

              {/* 残りの文字 */}
              <span className={gameStyles.remainingText}>
                {restChars}
              </span>
            </div>

            {/* ローマ字表示 */}
            <div className={gameStyles.romajiDisplay}>
              <span className={gameStyles.typedRomaji}>
                {displayInfo.romaji?.substring(0, displayInfo.typedLength)}
              </span>
              <span className={`${gameStyles.currentRomaji} ${isConsonantInput ? gameStyles.consonantInput : ''}`}>
                {displayInfo.currentCharRomaji}
              </span>
              <span className={gameStyles.nextInput}>
                {displayInfo.nextChar ? `${displayInfo.nextChar}...` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* ステータス表示 */}
        <div className={gameStyles.statusArea}>
          <div className={gameStyles.inputMode}>
            {isConsonantInput && (
              <span className={gameStyles.consonantBadge}>子音入力中</span>
            )}
          </div>

          <div className={`${gameStyles.comboDisplay} ${stats.comboCount >= 5 ? gameStyles.highCombo : ''}`}>
            {stats.comboCount >= 3 ? `${stats.comboCount} Combo!` : ''}
          </div>

          <div className={gameStyles.rankDisplay}>
            {stats.rank !== 'F' ? `Rank: ${stats.rank}` : ''}
          </div>
        </div>
      </div>

      <div className={gameStyles.gameFooter}>
        <div className={gameStyles.hintText}>
          {isFocused ? 'タイピングを始めてください' : 'クリックしてフォーカスを戻す'}
        </div>
        <div className={gameStyles.settingHints}>
          <span>F1: フィードバック表示切替</span>
          <span>F2: フィードバック位置変更</span>
        </div>
        {/* フォーカス管理用の隠しフィールド */}
        <input
          ref={inputRef}
          className={gameStyles.hiddenInput}
          autoFocus
          onBlur={() => inputRef.current?.focus()}
          readOnly
        />
      </div>

      {/* リアルタイムフィードバック表示 */}
      {showFeedback && mcpContext.isActive && (
        <MCPFeedbackDisplay
          mcpContext={mcpContext}
          position={feedbackPosition}
          showHistory={true}
        />
      )}

      {/* MCP Debug Display (開発時のみ) */}
      {process.env.NODE_ENV === 'development' && <mcpUtils.MCPStatusDisplay position="bottom-right" />}

      {/* 簡易トースト表示 */}
      {toast.visible && (
        <div className={gameStyles.toast} style={{
          position: 'fixed',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '5px',
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.3s ease',
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default MCPGameScreen;