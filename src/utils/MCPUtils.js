/**
 * MCPUtils.js
 * Model Context Protocol統合のためのユーティリティ
 * @modelcontextprotocol/server-github と連携して、
 * タイピングゲーム全体の統括・分析・最適化を支援する
 */

import { useState, useEffect } from 'react';

// プロジェクト識別用のメタデータ
const PROJECT_METADATA = {
  name: 'Manaby Typing Game',
  version: '0.1.0',
  repositoryUrl: process.env.NEXT_PUBLIC_GITHUB_REPO || 'https://github.com/user/manaby-typing-game',
};

/**
 * MCPContextManager
 * MCPのコンテキスト管理とメトリクス収集を行うクラス
 */
class MCPContextManager {
  constructor() {
    this.isInitialized = false;
    this.metricsBuffer = [];
    this.contextSessions = new Map();
    this.debugMode = process.env.NODE_ENV === 'development';
    this.mcpEnabled = typeof window !== 'undefined' && 
                      !!(window._mcp || window.__MCP_CONNECTION__);
    
    // パフォーマンス設定 - タイピング時の最適化
    this.performanceSettings = {
      // バッチサイズを増やして送信頻度を下げる（20→50）
      maxBatchSize: 50,
      // タイピング中は低頻度で送信
      typingModeSendInterval: 2000, // ms
      // 通常モードでの送信間隔
      normalModeSendInterval: 1000, // ms
      // 現在のモード
      isInTypingMode: false
    };
    
    // 定期送信用タイマー
    this.flushTimer = null;
  }

  /**
   * MCPマネージャーを初期化する
   */
  async initialize() {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    try {
      // MCPサーバー接続を検出
      if (window._mcp || window.__MCP_CONNECTION__) {
        console.log('[MCP] MCPサーバー接続を検出しました');
        this.mcpEnabled = true;

        // グローバルエラーハンドラ登録
        window.addEventListener('error', this.handleGlobalError.bind(this));
        
        // パフォーマンスモニタリング開始
        if (typeof window.performance !== 'undefined') {
          this.startPerformanceMonitoring();
        }
        
        // 定期的なバッファフラッシュを開始
        this.startPeriodicFlush();
        
        this.isInitialized = true;
        console.log('[MCP] コンテキストマネージャー初期化完了');
      } else {
        console.log('[MCP] MCPサーバー接続が検出されませんでした');
        this.mcpEnabled = false;
      }
    } catch (err) {
      console.error('[MCP] 初期化エラー:', err);
      this.mcpEnabled = false;
    }
  }
  
  /**
   * 定期的なメトリクスバッファのフラッシュを開始
   */
  startPeriodicFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // モードに応じた間隔で設定
    const interval = this.performanceSettings.isInTypingMode ? 
      this.performanceSettings.typingModeSendInterval : 
      this.performanceSettings.normalModeSendInterval;
      
    this.flushTimer = setInterval(() => {
      this.flushMetricsBuffer();
    }, interval);
  }
  
  /**
   * タイピングモードを設定（パフォーマンス最適化用）
   * @param {boolean} isTypingMode - タイピング中かどうか
   */
  setTypingMode(isTypingMode) {
    // 状態が変わった場合のみ処理
    if (this.performanceSettings.isInTypingMode !== isTypingMode) {
      this.performanceSettings.isInTypingMode = isTypingMode;
      
      // タイマーを再設定
      this.startPeriodicFlush();
      
      if (this.debugMode) {
        console.log(`[MCP] タイピングモード: ${isTypingMode ? '有効' : '無効'}`);
      }
    }
  }

  /**
   * モジュールを読み込んだことをMCPに通知する
   * @param {string} moduleId - モジュールID
   * @param {string} modulePath - モジュールのパス
   */
  registerModuleLoad(moduleId, modulePath) {
    if (!this.mcpEnabled) return;

    try {
      const moduleData = {
        id: moduleId,
        path: modulePath,
        loadTime: Date.now(),
        contextType: 'module-load'
      };

      this.sendToMCP('module:load', moduleData);
      
      if (this.debugMode) {
        console.log(`[MCP] モジュール読み込み: ${moduleId} (${modulePath})`);
      }
    } catch (err) {
      console.error(`[MCP] モジュール登録エラー: ${moduleId}`, err);
    }
  }

  /**
   * コンポーネントをレンダリングしたことをMCPに通知する
   * @param {string} componentName - コンポーネント名
   */
  registerComponentRender(componentName) {
    if (!this.mcpEnabled) return;

    try {
      const timestamp = Date.now();
      const renderData = {
        component: componentName,
        timestamp: timestamp,
        contextType: 'component-render'
      };

      // レンダリング時間を計測するためのセッション開始
      if (!this.contextSessions.has(componentName)) {
        this.contextSessions.set(componentName, { 
          startTime: timestamp,
          renderCount: 1
        });
      } else {
        const session = this.contextSessions.get(componentName);
        session.renderCount++;
        this.contextSessions.set(componentName, session);
      }

      this.sendToMCP('component:render', renderData);
    } catch (err) {
      console.error(`[MCP] コンポーネント登録エラー: ${componentName}`, err);
    }
  }

  /**
   * タイピング入力をMCPに記録する
   * @param {Object} typingData - タイピング関連データ
   */
  recordTypingInput(typingData) {
    if (!this.mcpEnabled) return;
    
    // タイピングモードを有効化
    this.setTypingMode(true);

    try {
      const typingMetric = {
        timestamp: Date.now(),
        ...typingData,
        contextType: 'typing-event'
      };

      // バッファリングして一度に送信する（パフォーマンス向上のため）
      this.metricsBuffer.push(typingMetric);

      // バッファが設定した最大サイズに達したらまとめて送信
      if (this.metricsBuffer.length >= this.performanceSettings.maxBatchSize) {
        this.flushMetricsBuffer();
      }
    } catch (err) {
      console.error('[MCP] タイピング記録エラー:', err);
    }
  }

  /**
   * ゲームの状態変化をMCPに記録する
   * @param {string} eventType - イベントタイプ
   * @param {Object} gameState - ゲーム状態
   */
  recordGameEvent(eventType, gameState) {
    if (!this.mcpEnabled) return;
    
    // イベントタイプに基づいてタイピングモードを設定
    if (eventType === 'game_start' || eventType === 'typing_start') {
      this.setTypingMode(true);
    }
    else if (eventType === 'game_end' || eventType === 'typing_end' || 
             eventType === 'menu_screen' || eventType === 'result_screen') {
      this.setTypingMode(false);
    }

    try {
      const gameEvent = {
        eventType,
        timestamp: Date.now(),
        gameState: {
          // 必要な情報のみを抽出（軽量化）
          screen: gameState.currentScreen,
          solvedCount: gameState.solvedCount || 0,
          isGameClear: !!gameState.isGameClear,
          difficulty: gameState.difficulty || 'normal',
          stats: gameState.stats ? {
            kpm: gameState.stats.kpm || 0,
            accuracy: gameState.stats.accuracy || 0
          } : null
        },
        contextType: 'game-event'
      };

      this.sendToMCP('game:event', gameEvent);
      
      if (this.debugMode) {
        console.log(`[MCP] ゲームイベント: ${eventType}`);
      }
    } catch (err) {
      console.error(`[MCP] ゲームイベント記録エラー: ${eventType}`, err);
    }
  }

  /**
   * パフォーマンスメトリクスをMCPに送信する
   * @param {string} metricName - メトリクス名
   * @param {number|Object} value - メトリクス値
   */
  recordPerformanceMetric(metricName, value) {
    if (!this.mcpEnabled) return;
    
    // タイピングモード中は重要なメトリクスのみを記録
    if (this.performanceSettings.isInTypingMode && 
        metricName !== 'fps' && 
        metricName !== 'longTask' &&
        !metricName.startsWith('typing_')) {
      return; // タイピング中は重要でないメトリクスをスキップ
    }

    try {
      const metric = {
        name: metricName,
        value,
        timestamp: Date.now(),
        contextType: 'performance-metric'
      };
      
      // タイピング中は直接送信ではなくバッファリング
      if (this.performanceSettings.isInTypingMode) {
        this.metricsBuffer.push(metric);
      } else {
        // 通常モードでは即時送信
        this.sendToMCP('performance:metric', metric);
      }
    } catch (err) {
      console.error(`[MCP] パフォーマンスメトリクス記録エラー: ${metricName}`, err);
    }
  }

  /**
   * ユーザー体験要素をMCPに記録する
   * @param {string} elementType - 体験要素タイプ
   * @param {Object} data - 関連データ
   */
  recordUXElement(elementType, data) {
    if (!this.mcpEnabled) return;
    
    // タイピングモード中はUX要素の記録をスキップ
    if (this.performanceSettings.isInTypingMode) return;

    try {
      const uxData = {
        elementType,
        timestamp: Date.now(),
        data,
        contextType: 'ux-element'
      };

      this.sendToMCP('ux:element', uxData);
    } catch (err) {
      console.error(`[MCP] UX要素記録エラー: ${elementType}`, err);
    }
  }

  /**
   * グローバルエラーハンドラ
   * @param {ErrorEvent} event - エラーイベント
   */
  handleGlobalError(event) {
    if (!this.mcpEnabled) return;

    try {
      const errorData = {
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now(),
        contextType: 'error'
      };

      this.sendToMCP('error:global', errorData);
      
      console.error('[MCP] グローバルエラー検出:', errorData);
    } catch (err) {
      console.error('[MCP] エラー処理中のエラー:', err);
    }
  }

  /**
   * メトリクスバッファの内容を送信する
   */
  flushMetricsBuffer() {
    if (!this.mcpEnabled || this.metricsBuffer.length === 0) return;

    try {
      const batchData = {
        metricsCount: this.metricsBuffer.length,
        metrics: [...this.metricsBuffer],
        timestamp: Date.now(),
        contextType: 'metrics-batch'
      };

      this.sendToMCP('metrics:batch', batchData);
      
      // バッファをクリア
      this.metricsBuffer = [];
      
      if (this.debugMode) {
        console.log(`[MCP] メトリクスバッチ送信: ${batchData.metricsCount}件`);
      }
    } catch (err) {
      console.error('[MCP] メトリクスバッファ送信エラー:', err);
      
      // エラー発生時もバッファをクリアする（メモリリーク防止）
      this.metricsBuffer = [];
    }
  }

  /**
   * パフォーマンスモニタリングを開始する
   */
  startPerformanceMonitoring() {
    if (!this.mcpEnabled || typeof window === 'undefined' || !window.performance) return;

    try {
      // FPSモニタリング
      let frameCount = 0;
      let lastFrameTime = performance.now();
      const measureFPS = () => {
        const now = performance.now();
        frameCount++;
        
        // 1秒ごとにFPS計測
        if (now - lastFrameTime >= 1000) {
          const fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
          this.recordPerformanceMetric('fps', fps);
          
          frameCount = 0;
          lastFrameTime = now;
        }
        
        requestAnimationFrame(measureFPS);
      };
      
      // FPS計測開始
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(measureFPS);
      }
      
      // メモリ使用量（対応ブラウザのみ）
      if (performance.memory) {
        // タイピング中は10秒ごと、通常時は5秒ごとに計測
        let lastMemoryCheck = 0;
        const checkMemory = () => {
          const now = Date.now();
          // タイピング中は頻度を下げる
          const interval = this.performanceSettings.isInTypingMode ? 10000 : 5000;
          
          if (now - lastMemoryCheck >= interval) {
            this.recordPerformanceMetric('memory', {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            });
            lastMemoryCheck = now;
          }
          
          setTimeout(checkMemory, 1000);
        };
        
        checkMemory();
      }
      
      // ロング・タスクの検出
      if (typeof PerformanceObserver === 'function' && 
          PerformanceObserver.supportedEntryTypes && 
          PerformanceObserver.supportedEntryTypes.includes('longtask')) {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            // タイピング中は長い処理（50ms以上）のみを記録
            const threshold = this.performanceSettings.isInTypingMode ? 50 : 30;
            
            if (entry.duration >= threshold) {
              this.recordPerformanceMetric('longTask', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              });
            }
          });
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      }
    } catch (err) {
      console.error('[MCP] パフォーマンスモニタリング初期化エラー:', err);
    }
  }

  /**
   * MCPサーバーにデータを送信する
   * @param {string} channel - 送信チャンネル
   * @param {Object} data - 送信データ
   */
  sendToMCP(channel, data) {
    if (!this.mcpEnabled || typeof window === 'undefined') return;

    try {
      // MCPコネクションを取得
      const mcpConnection = window._mcp || window.__MCP_CONNECTION__;
      
      if (!mcpConnection) {
        console.warn('[MCP] MCPコネクションが見つかりません');
        return;
      }
      
      // プロジェクトメタデータを追加
      const enrichedData = {
        ...data,
        projectMetadata: PROJECT_METADATA,
        timestamp: data.timestamp || Date.now()
      };
      
      // MCPサーバーにデータを送信
      if (typeof mcpConnection.sendMessage === 'function') {
        mcpConnection.sendMessage(channel, enrichedData);
      } else if (typeof mcpConnection.send === 'function') {
        mcpConnection.send(channel, enrichedData);
      } else {
        console.warn('[MCP] MCPコネクションに適切な送信メソッドがありません');
      }
    } catch (err) {
      console.error(`[MCP] MCP送信エラー (${channel}):`, err);
    }
  }
  
  /**
   * クリーンアップ処理
   */
  cleanup() {
    // タイマーをクリア
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // 残っているメトリクスをすべて送信
    this.flushMetricsBuffer();
  }

  /**
   * ユーザーのタイピングパターン分析と推奨トレーニングを取得
   * @returns {Promise<Object>} 分析結果と推奨トレーニング
   */
  async getTypingAnalysis() {
    if (!this.mcpEnabled || typeof window === 'undefined') {
      return { success: false, error: 'MCPサーバーに接続されていません' };
    }
    
    try {
      // MCPコネクションを取得
      const mcpConnection = window._mcp || window.__MCP_CONNECTION__;
      
      if (!mcpConnection) {
        return { success: false, error: 'MCPコネクションが見つかりません' };
      }
      
      // MCPサーバーにタイピング分析をリクエスト
      return new Promise((resolve) => {
        const requestId = `analysis_${Date.now()}`;
        
        // レスポンスハンドラを一時的に設定
        const originalOnMessage = mcpConnection.onMessage || mcpConnection.onmessage;
        
        const handleResponse = (event) => {
          try {
            const response = typeof event === 'object' ? 
              (event.data ? event.data : event) : 
              JSON.parse(event);
            
            if (response.requestId === requestId && response.type === 'typing_analysis') {
              // レスポンスハンドラを元に戻す
              if (typeof mcpConnection.onMessage === 'function') {
                mcpConnection.onMessage = originalOnMessage;
              } else if (typeof mcpConnection.onmessage === 'function') {
                mcpConnection.onmessage = originalOnMessage;
              }
              
              resolve({
                success: true,
                analysis: response.analysis,
                recommendations: response.recommendations
              });
            }
          } catch (err) {
            console.error('[MCP] 分析レスポンス処理エラー:', err);
          }
        };
        
        // 一時的なメッセージハンドラを設定
        if (typeof mcpConnection.onMessage === 'function') {
          mcpConnection.onMessage = handleResponse;
        } else if (typeof mcpConnection.onmessage === 'function') {
          mcpConnection.onmessage = handleResponse;
        }
        
        // 分析リクエストを送信
        const analysisRequest = {
          type: 'request_analysis',
          requestId,
          timestamp: Date.now(),
          projectMetadata: PROJECT_METADATA
        };
        
        if (typeof mcpConnection.sendMessage === 'function') {
          mcpConnection.sendMessage('analysis:request', analysisRequest);
        } else if (typeof mcpConnection.send === 'function') {
          mcpConnection.send('analysis:request', analysisRequest);
        } else {
          resolve({ success: false, error: 'MCPコネクションに適切な送信メソッドがありません' });
        }
        
        // タイムアウト処理
        setTimeout(() => {
          resolve({ 
            success: false, 
            error: '分析リクエストがタイムアウトしました',
            fallbackRecommendations: this._generateFallbackRecommendations()
          });
          
          // メッセージハンドラを元に戻す
          if (typeof mcpConnection.onMessage === 'function') {
            mcpConnection.onMessage = originalOnMessage;
          } else if (typeof mcpConnection.onmessage === 'function') {
            mcpConnection.onmessage = originalOnMessage;
          }
        }, 5000);
      });
    } catch (err) {
      console.error('[MCP] タイピング分析リクエストエラー:', err);
      return { 
        success: false, 
        error: err.message,
        fallbackRecommendations: this._generateFallbackRecommendations() 
      };
    }
  }
  
  /**
   * フォールバック用の推奨トレーニングを生成
   * MCPサーバーからの応答がない場合のバックアップ
   * @private
   */
  _generateFallbackRecommendations() {
    // メトリクスバッファから最近のタイピングイベントを抽出
    const typingEvents = this.metricsBuffer.filter(
      metric => metric.contextType === 'typing-event'
    );
    
    // 簡易的な分析を実行
    const mistakeCount = {};
    let totalMistakes = 0;
    
    typingEvents.forEach(event => {
      if (event.isCorrect === false && event.expectedKey) {
        mistakeCount[event.expectedKey] = (mistakeCount[event.expectedKey] || 0) + 1;
        totalMistakes++;
      }
    });
    
    // ミスの多いキーを特定
    const problemKeys = Object.entries(mistakeCount)
      .filter(([_, count]) => count >= 2)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    // 推奨トレーニングを生成
    return {
      problemKeys: problemKeys.map(item => item.key),
      recommendedFocus: problemKeys.length > 0 ? '苦手なキーの練習' : 'スピードトレーニング',
      recommendedMode: problemKeys.length > 0 ? 'practice' : 'speed',
    };
  }
}

// シングルトンインスタンスを作成
const mcpManager = new MCPContextManager();

/**
 * React用のMCPインテグレーションフック
 * コンポーネント内でMCP機能を使用するためのフック
 */
export const useMCPContext = () => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // コンポーネントマウント時にMCPマネージャーを初期化
    mcpManager.initialize().then(() => {
      setIsActive(mcpManager.mcpEnabled);
    });
    
    // クリーンアップ関数
    return () => {
      mcpManager.flushMetricsBuffer();
    };
  }, []);
  
  // コンポーネント名を自動検出
  useEffect(() => {
    try {
      // Reactコンポーネント名を取得（開発モードのみ）
      const componentStack = new Error().stack;
      const componentNameMatch = componentStack && componentStack.match(/at ([A-Z][A-Za-z0-9$_]+) /);
      const componentName = componentNameMatch ? componentNameMatch[1] : 'UnknownComponent';
      
      // コンポーネントのレンダリングを登録
      mcpManager.registerComponentRender(componentName);
    } catch (err) {
      // エラー処理を省略（MCP機能は非クリティカル）
    }
  }, []);
  
  return {
    isActive,
    recordTypingInput: mcpManager.recordTypingInput.bind(mcpManager),
    recordGameEvent: mcpManager.recordGameEvent.bind(mcpManager),
    recordPerformanceMetric: mcpManager.recordPerformanceMetric.bind(mcpManager),
    recordUXElement: mcpManager.recordUXElement.bind(mcpManager),
    setTypingMode: mcpManager.setTypingMode.bind(mcpManager)
  };
};

/**
 * MCP UI表示コンポーネント
 * MCPの状態をUI上に表示するためのコンポーネント
 */
export const MCPStatusDisplay = ({ position = 'bottom-right' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState({
    connected: mcpManager.mcpEnabled,
    metricsCount: 0,
    lastUpdate: Date.now(),
    isTypingMode: mcpManager.performanceSettings?.isInTypingMode
  });
  
  // ステータス更新
  useEffect(() => {
    mcpManager.initialize();
    
    const updateInterval = setInterval(() => {
      setStatus({
        connected: mcpManager.mcpEnabled,
        metricsCount: mcpManager.metricsBuffer.length,
        lastUpdate: Date.now(),
        isTypingMode: mcpManager.performanceSettings?.isInTypingMode
      });
    }, 2000);
    
    return () => clearInterval(updateInterval);
  }, []);
  
  // 表示位置のスタイル定義
  const positionStyles = {
    'bottom-right': {
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      zIndex: 9999
    },
    'bottom-left': {
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      zIndex: 9999
    },
    'top-right': {
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 9999
    },
    'top-left': {
      position: 'fixed',
      top: '10px',
      left: '10px',
      zIndex: 9999
    }
  };
  
  // インジケーターのスタイル定義
  const indicatorStyle = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: status.connected ? '#4CAF50' : '#F44336',
    display: 'inline-block',
    marginRight: '8px'
  };
  
  // 最小化表示のスタイル
  const minimizedStyle = {
    ...positionStyles[position],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center'
  };
  
  // 展開表示のスタイル
  const expandedStyle = {
    ...positionStyles[position],
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    color: 'white',
    padding: '10px',
    borderRadius: '4px',
    width: '250px',
    fontSize: '12px'
  };
  
  if (typeof window === 'undefined') {
    return null; // サーバーサイドレンダリング時は何も表示しない
  }
  
  // 最小表示の場合
  if (!isExpanded) {
    return (
      <div style={minimizedStyle} onClick={() => setIsExpanded(true)}>
        <div style={indicatorStyle}></div>
        <span>MCP {status.connected ? '接続中' : '未接続'}</span>
      </div>
    );
  }
  
  // 展開表示の場合
  return (
    <div style={expandedStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={indicatorStyle}></div>
          <span style={{ fontWeight: 'bold' }}>MCP Status</span>
        </div>
        <div 
          style={{ cursor: 'pointer' }} 
          onClick={() => setIsExpanded(false)}
        >
          ×
        </div>
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <div>接続状態: {status.connected ? '接続済み' : '未接続'}</div>
        <div>メトリクスバッファ: {status.metricsCount} 件</div>
        <div>モード: {status.isTypingMode ? 'タイピング中' : '通常'}</div>
        <div>最終更新: {new Date(status.lastUpdate).toLocaleTimeString()}</div>
      </div>
      
      <div 
        style={{ 
          textAlign: 'center', 
          marginTop: '10px',
          padding: '5px',
          backgroundColor: '#2196F3',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        onClick={() => mcpManager.flushMetricsBuffer()}
      >
        メトリクス送信
      </div>
    </div>
  );
};

// MCPユーティリティの公開メソッド
const MCPUtils = {
  initialize: mcpManager.initialize.bind(mcpManager),
  recordTypingInput: mcpManager.recordTypingInput.bind(mcpManager),
  recordGameEvent: mcpManager.recordGameEvent.bind(mcpManager),
  recordPerformanceMetric: mcpManager.recordPerformanceMetric.bind(mcpManager),
  recordUXElement: mcpManager.recordUXElement.bind(mcpManager),
  flushMetricsBuffer: mcpManager.flushMetricsBuffer.bind(mcpManager),
  setTypingMode: mcpManager.setTypingMode.bind(mcpManager),
  cleanup: mcpManager.cleanup.bind(mcpManager),
  useMCPContext,
  MCPStatusDisplay,
  getTypingAnalysis: mcpManager.getTypingAnalysis.bind(mcpManager)
};

export default MCPUtils;