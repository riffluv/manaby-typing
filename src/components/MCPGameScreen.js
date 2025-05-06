/**
 * MCPGameScreen.js
 * MCPアーキテクチャを利用した高性能タイピングゲーム画面
 * リファクタリング済み（2025年5月7日）
 */
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMCPContext } from '@/utils/MCPUtils';
import styles from '@/styles/GameScreen.module.css';
import { useSoundSystem } from '@/contexts/SoundContext';
import TypingDisplay from '@/components/typing/TypingDisplay';
import TypingProgress from '@/components/typing/TypingProgress';
import TypingStats from '@/components/typing/TypingStats';

// MCP通信用の定数
const TypingCommands = {
  INIT_PROBLEM: 'init_problem',
  PROCESS_INPUT: 'process_input',
  COMPLETE_PROBLEM: 'complete_problem',
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
  const soundSystem = useSoundSystem();
  
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

    // 初期化処理実行
    initializeProblem();

    // クリーンアップ関数
    return () => {
      // イベントリスナーの削除
      if (typeof window !== 'undefined' && window._mcp) {
        window._mcp.off(TypingEvents.DISPLAY_UPDATED, handleDisplayUpdate);
      }
    };
  }, [problem, mcpContext]);

  /**
   * キーボード入力イベントの登録
   */
  useEffect(() => {
    if (!problem) return;

    // キーボードイベントリスナー登録
    window.addEventListener('keydown', handleKeyDown);
    
    // フォーカス関連イベントリスナー登録
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    // クリーンアップ関数
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [problem, isFocused, handleKeyDown]);

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
  }, [isFocused, navigateTo, soundSystem]);

  /**
   * 入力処理（高速化のためuseCallbackの外に定義）
   */
  const processInput = (key) => {
    // パフォーマンス測定開始
    const startTime = performance.now();
    
    try {
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
  };

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
  }, [problem, soundSystem, onProblemComplete]);

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