import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getTypingModelInstance } from '../../utils/mcp/TypingModelMCP';
import { TypingEvents, TypingCommands } from '../../utils/mcp/TypingProtocol';
import soundSystem from '../../utils/SoundUtils';

/**
 * MCPアーキテクチャに対応したタイピングゲーム用Reactフック
 * 
 * @param {Object} options オプション
 * @param {Object} options.initialProblem 初期問題
 * @param {boolean} options.playSound 効果音を再生するかどうか
 * @param {Function} options.onProblemComplete 問題完了時のコールバック
 * @returns {Object} タイピングゲームの状態と操作メソッド
 */
export function useMCPTypingGame({
  initialProblem = null,
  playSound = true,
  onProblemComplete = () => { }
} = {}) {
  // 表示用の状態（必要最小限をステート管理）
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
  
  // 統計情報の状態
  const [stats, setStats] = useState({
    correctKeyCount: 0,
    mistakeCount: 0,
    kpm: 0,
    accuracy: 100,
    rank: 'F',
    elapsedTimeSeconds: 0
  });

  // パフォーマンス監視用
  const perfRef = useRef({
    lastInputTime: 0,
    inputCount: 0,
    frameRate: 0
  });
  
  // コールバック参照
  const callbackRef = useRef(onProblemComplete);
  useEffect(() => {
    callbackRef.current = onProblemComplete;
  }, [onProblemComplete]);

  // MCP初期化用のマウントチェック
  const isMountedRef = useRef(false);
  
  /**
   * MCPイベントハンドラを登録
   */
  useEffect(() => {
    // すでに初期化済みなら何もしない
    if (isMountedRef.current) return;
    
    // ブラウザのみで動作
    if (typeof window === 'undefined' || !window._mcp) {
      console.warn('MCPが利用できないため、MCPイベントを登録できません');
      return;
    }
    
    isMountedRef.current = true;
    const typingModel = getTypingModelInstance();
    
    // 各種イベントリスナーを設定
    const unsubscribers = [
      // 表示情報の更新イベントを処理
      typingModel.addEventListener(TypingEvents.DISPLAY_UPDATED, (data) => {
        if (data && data.displayInfo) {
          setDisplayInfo(data.displayInfo);
        }
      }),
      
      // 入力処理イベントを処理
      typingModel.addEventListener(TypingEvents.INPUT_PROCESSED, (data) => {
        if (!data) return;
        
        // パフォーマンス測定
        const now = Date.now();
        const perf = perfRef.current;
        const frameTime = perf.lastInputTime > 0 ? now - perf.lastInputTime : 0;
        perf.lastInputTime = now;
        perf.inputCount++;
        
        // 正解の場合
        if (data.result && data.result.success) {
          // 効果音再生
          if (playSound) {
            soundSystem.playSound('success');
          }
          
          // 10回の入力ごとにフレームレートを更新
          if (perf.inputCount % 10 === 0) {
            perf.frameRate = frameTime > 0 ? Math.round(1000 / frameTime) : 0;
          }
          
          // 完了チェック
          if (data.result.status === 'all_completed') {
            handleProblemComplete();
          }
        } else {
          // 不正解の場合
          
          // 効果音再生
          if (playSound) {
            soundSystem.playSound('error');
          }
        }
      }),
      
      // 統計情報の更新イベントを処理
      typingModel.addEventListener(TypingEvents.STATS_UPDATED, (data) => {
        if (data && data.stats) {
          setStats(data.stats);
        }
      }),
      
      // エラーイベントを処理
      typingModel.addEventListener(TypingEvents.ERROR, (data) => {
        console.error('タイピングMCPエラー:', data);
      })
    ];
    
    // クリーンアップ関数
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [playSound]);

  /**
   * 初期問題の設定
   */
  useEffect(() => {
    if (initialProblem && typeof window !== 'undefined' && window._mcp) {
      initializeSession(initialProblem);
    }
  }, [initialProblem]);

  /**
   * 問題完了時の処理
   */
  const handleProblemComplete = useCallback(() => {
    if (typeof window === 'undefined' || !window._mcp) return;
    
    // 現在の統計情報を取得
    window._mcp.send(TypingCommands.GET_STATS, null, (response) => {
      if (!response || !response.stats) return;
      
      const stats = response.stats;
      
      // 問題の完了を通知
      window._mcp.send(TypingCommands.COMPLETE_PROBLEM, null, (result) => {
        if (!result || !result.success) return;
        
        // コールバックを呼び出し
        if (callbackRef.current) {
          callbackRef.current({
            problemKeyCount: result.result?.problemKeyCount || 0,
            problemElapsedMs: result.result?.problemElapsedMs || 0,
            problemKPM: result.result?.problemKPM || 0,
            updatedProblemKPMs: (result.result?.problemStats || []).map(p => p.problemKPM || 0),
            problemStats: result.result?.problemStats || []
          });
        }
        
        // 成功音再生
        if (playSound) {
          soundSystem.play('complete');
        }
      });
    });
  }, [playSound]);

  /**
   * セッション初期化処理
   */
  const initializeSession = useCallback((problem) => {
    if (!problem) return;
    
    if (typeof window === 'undefined' || !window._mcp) {
      console.warn('MCPが利用できないため、タイピングセッションを初期化できません');
      return;
    }
    
    // MCPを通じてセッションを初期化
    window._mcp.send(TypingCommands.INITIALIZE, {
      problem
    }, (response) => {
      if (!response || !response.success) {
        console.error('タイピングセッションの初期化に失敗しました:', response?.error || '不明なエラー');
        return;
      }
      
      console.log('タイピングセッションが初期化されました:', response);
    });
  }, []);

  /**
   * キー入力処理
   */
  const handleInput = useCallback((key) => {
    if (typeof window === 'undefined' || !window._mcp) {
      console.warn('MCPが利用できないため、キー入力を処理できません');
      return { success: false };
    }

    // AudioContextの状態がsuspendedの場合は再開
    soundSystem.resume();

    // MCPを通じて入力を処理（同期バージョン）
    let result = { success: false };
    
    window._mcp.send(TypingCommands.PROCESS_INPUT, { key }, (response) => {
      if (!response) return;
      result = response.result || { success: false };
    });
    
    return result;
  }, []);

  /**
   * スコア送信処理
   */
  const submitScore = useCallback((username = 'Anonymous', endpoint) => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window._mcp) {
        reject(new Error('MCPが利用できないため、スコアを送信できません'));
        return;
      }
      
      window._mcp.send(TypingCommands.SUBMIT_SCORE, {
        username,
        endpoint
      }, (response) => {
        if (!response || !response.success) {
          reject(new Error(response?.error || 'スコア送信に失敗しました'));
          return;
        }
        
        resolve(response.result);
      });
    });
  }, []);

  /**
   * 公開API
   */
  return {
    // 表示情報
    ...displayInfo,
    
    // 統計情報
    stats,
    
    // パフォーマンス情報
    perfStats: {
      frameRate: perfRef.current.frameRate
    },
    
    // 操作メソッド
    handleInput,
    initializeSession,
    submitScore,
    
    // 完了状態
    isCompleted: displayInfo.isCompleted,
    
    // エラー状態
    errorAnimation: displayInfo.isError,
    
    // 次のキー取得
    getCurrentExpectedKey: () => displayInfo.nextChar,
    
    // MCPフラグ
    isMCPBased: true
  };
}

export default useMCPTypingGame;