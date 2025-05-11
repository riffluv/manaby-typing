'use client';

/**
 * useTypingGameOptimized.js
 * 最適化されたタイピングゲームの統合レイヤー
 * Workerと連携して更に高速化
 * 
 * 2025年5月改修:
 * - タイピング処理をメインスレッドで実行し、レスポンス性能を向上
 * - スコア計算のみWorkerに委譲し、CPUリソースを効率活用
 */

import { useCallback, useEffect, useRef } from 'react';
import { useOptimizedTyping } from './useOptimizedTyping';

// Workerマネージャーのインポート
import typingWorkerManager from '@/utils/TypingWorkerManager';
import scoreWorkerManager from '@/utils/ScoreWorkerManager';

/**
 * 最適化されたタイピングゲームフックとWorkerの連携
 * パフォーマンスを最大限に引き出すためのラッパー
 * 
 * @param {Object} options 設定オプション
 * @returns {Object} 最適化されたタイピングゲームAPI
 */
export function useTypingGameOptimized(options = {}) {
  // 基本となるoptimizedTypingフックを使用
  const optimizedTyping = useOptimizedTyping(options);
  
  // Worker参照
  const workerRef = useRef(null);
    /**
   * Worker初期化
   * - タイピング処理はメインスレッドで実行（レスポンス向上）
   * - スコア計算はWorkerで実行（CPU効率化）
   */
  const initializeWorker = useCallback(() => {
    if (!workerRef.current) {
      // タイピングWorkerは必要なときだけ初期化（スコア処理のみに利用）
      workerRef.current = {
        initialized: true
      };
      
      // 必要に応じてWorkerとのメッセージ交換を設定
      // これはパフォーマンス重視の場合必要最小限に保つ
    }
  }, []);
  
  /**
   * スコア計算をWorkerに委譲
   * 複雑な計算をWorkerに任せることで、UI処理のブロッキングを防止
   */
  const submitToWorker = useCallback((action, data) => {
    if (!workerRef.current) {
      initializeWorker();
    }
    
    // アクションに応じて適切なワーカーマネージャーを選択
    if (action.startsWith('calculate') || action === 'updateStats') {
      // スコア関連処理はScoreWorkerManagerを使用
      return scoreWorkerManager.calculateStats(data);
    } else {
      // その他の処理は従来のTypingWorkerManagerを使用
      return typingWorkerManager.executeAction(action, data);
    }
  }, [initializeWorker]);
    /**
   * スコア送信 - Worker処理版
   * スコア関連の計算をScoreWorkerManagerに委譲
   */
  const submitScore = useCallback((endpoint, options = {}) => {
    const stats = optimizedTyping.statsRef.current;
    
    const recordData = {
      correctCount: stats.correctKeyCount || 0,
      missCount: stats.mistakeCount || 0,
      elapsedTimeMs: Date.now() - (stats.startTime || Date.now()),
      problemStats: stats.problemStats || [],
      ...options
    };
    
    // 非同期でスコア計算を行い、結果を取得
    return scoreWorkerManager.calculateScore(recordData)
      .then(scoreResult => {
        // スコア計算結果を使用してランキング送信データを準備
        const rankingData = {
          ...scoreResult,
          correctCount: recordData.correctCount,
          missCount: recordData.missCount,
          problemCount: stats.problemStats?.length || 0,
          endpoint,
          timestamp: Date.now(),
        };
        
        // ランキング送信処理を実行
        return typingWorkerManager.executeAction('submitRanking', rankingData);
      })
      .catch(error => {
        console.error('スコア計算エラー:', error);
        // エラー時はフォールバック処理
        return typingWorkerManager.executeAction('submitRanking', {
          kpm: optimizedTyping.displayStats.kpm || 0,
          accuracy: optimizedTyping.displayStats.accuracy || 100,
          correctCount: recordData.correctCount,
          missCount: recordData.missCount,
          problemCount: stats.problemStats?.length || 0,
          endpoint,
          timestamp: Date.now(),
          ...options
        });
      });
  }, [optimizedTyping.displayStats, optimizedTyping.statsRef]);
  
  /**
   * マウント時の初期化
   */
  useEffect(() => {
    // Worker初期化
    initializeWorker();
    
    return () => {
      // Workerはグローバルで管理されているため、
      // ここで明示的にクリーンアップはしません
    };
  }, [initializeWorker]);
    /**
   * スコアワーカーのパフォーマンスメトリクスを取得
   */
  const getScoreWorkerMetrics = useCallback(() => {
    return scoreWorkerManager.getMetrics();
  }, []);

  /**
   * タイピングの統計情報を非同期で計算
   */
  const calculateTypingStats = useCallback((statsData) => {
    return scoreWorkerManager.calculateStats(statsData || optimizedTyping.statsRef.current);
  }, [optimizedTyping.statsRef]);

  // 拡張API
  return {
    ...optimizedTyping,
    submitScore,
    submitToWorker,
    calculateTypingStats,
    getScoreWorkerMetrics
  };
}