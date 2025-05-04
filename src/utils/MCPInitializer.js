'use client';
/**
 * MCPInitializer.js
 * Model Context Protocol初期化用のクライアントコンポーネント
 */
import { useState, useEffect } from 'react';
import MCPUtils from './MCPUtils';

/**
 * MCP初期化用のクライアントコンポーネント
 * アプリケーション全体でMCPを初期化し、必要に応じてステータス表示を行う
 */
const MCPInitializer = () => {
  // MCPが初期化されたかどうか
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDebugUI, setShowDebugUI] = useState(process.env.NODE_ENV === 'development');
  const [performanceStats, setPerformanceStats] = useState(null);

  // MCPの初期化
  useEffect(() => {
    // MCPの初期化
    const initMCP = async () => {
      try {
        // MCPの初期化
        await MCPUtils.initialize();
        
        // アプリ初期化イベントを記録
        MCPUtils.recordGameEvent('app_initialized', {
          currentScreen: 'startup',
          userAgent: navigator.userAgent,
          windowSize: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          timestamp: Date.now()
        });
        
        setIsInitialized(true);
        console.log('[MCP] 初期化完了 ✅');
      } catch (err) {
        console.error('[MCP] 初期化エラー:', err);
      }
    };
    
    initMCP();
    
    // アンマウント時（アプリ終了時）にクリーンアップ
    return () => {
      try {
        // 保存していないメトリクスを送信
        MCPUtils.flushMetricsBuffer();
      } catch (err) {
        console.error('[MCP] クリーンアップエラー:', err);
      }
    };
  }, []);
  
  // パフォーマンス計測
  useEffect(() => {
    if (!isInitialized) return;
    
    let intervalId;
    
    const measurePerformance = () => {
      try {
        // 基本的なパフォーマンス指標を取得
        const perfData = {
          memory: window.performance && window.performance.memory 
            ? {
                usedJSHeapSize: Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024)),
                totalJSHeapSize: Math.round(window.performance.memory.totalJSHeapSize / (1024 * 1024)),
                jsHeapSizeLimit: Math.round(window.performance.memory.jsHeapSizeLimit / (1024 * 1024))
              }
            : null,
          navigationTiming: window.performance && window.performance.timing 
            ? {
                loadTime: window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart,
                domReadyTime: window.performance.timing.domComplete - window.performance.timing.domLoading,
                networkLatency: window.performance.timing.responseEnd - window.performance.timing.requestStart
              }
            : null
        };
        
        // パフォーマンスデータを表示用に保存
        setPerformanceStats(perfData);
        
        // MCPに記録
        MCPUtils.recordPerformanceMetric('app_performance', {
          timestamp: Date.now(),
          ...perfData
        });
      } catch (err) {
        console.error('[MCP] パフォーマンス計測エラー:', err);
      }
    };
    
    // セッション開始イベントを記録
    MCPUtils.recordGameEvent('session_start', {
      timestamp: Date.now(),
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      language: navigator.language
    });
    
    // ビジビリティ変更検出
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      
      MCPUtils.recordGameEvent(isVisible ? 'page_visible' : 'page_hidden', {
        timestamp: Date.now(),
        currentScreen: window.location.pathname
      });
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 定期的なパフォーマンス計測（開発モードのみ）
    if (process.env.NODE_ENV === 'development') {
      intervalId = setInterval(measurePerformance, 10000);
      measurePerformance(); // 初回計測
    }
    
    // ウィンドウのビューポートサイズ変更検出
    const handleResize = () => {
      MCPUtils.recordGameEvent('viewport_resize', {
        width: window.innerWidth,
        height: window.innerHeight,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    // セッション終了イベントを記録するためのbeforeunloadイベントリスナー
    const handleBeforeUnload = () => {
      MCPUtils.recordGameEvent('session_end', {
        timestamp: Date.now(),
        duration: Date.now() - (window.performance && window.performance.timing 
                               ? window.performance.timing.navigationStart 
                               : 0),
        currentPath: window.location.pathname
      });
      
      // 残りのメトリクスを送信
      MCPUtils.flushMetricsBuffer();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isInitialized]);
  
  // 何もレンダリングしない（またはデバッグUI）
  if (!showDebugUI) {
    return null;
  }
  
  // デバッグモードでのみUIを表示
  return (
    <div style={{ position: 'fixed', bottom: '10px', right: '10px', zIndex: 9999 }}>
      <div 
        style={{ 
          padding: '8px 12px',
          backgroundColor: 'rgba(0,0,0,0.7)', 
          color: 'white',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          cursor: 'pointer'
        }}
        onClick={() => setShowDebugUI(prev => !prev)}
      >
        MCP Active
      </div>
    </div>
  );
};

export default MCPInitializer;