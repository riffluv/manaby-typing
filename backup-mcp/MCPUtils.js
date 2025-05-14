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
  repositoryUrl: process.env.NEXT_PUBLIC_GITHUB_REPO || 'https://github.com/riffluv/manaby-typing',
};

/**
 * MCP Command Types
 * MCPアーキテクチャで使用するコマンドタイプの定義
 */
export const MCPCommandTypes = {
  INITIALIZE: 'mcp:initialize',
  TYPE_KEY: 'mcp:type_key',
  DELETE_KEY: 'mcp:delete_key',
  COMPLETE_PROBLEM: 'mcp:complete_problem',
  UPDATE_STATS: 'mcp:update_stats',
};

/**
 * MCP (Model Context Protocol) ユーティリティ
 * ブラウザ環境とサーバー環境の橋渡しを行う
 */

class MCPUtils {
  /**
   * MCPシステムを初期化する
   * @returns {Promise<void>}
   */
  initialize() {
    return new Promise((resolve, reject) => {
      try {
        console.log('[MCPUtils] MCP初期化を開始します');

        // MCP接続の確認
        if (typeof window === 'undefined' || !window._mcp) {
          console.warn('[MCPUtils] MCP接続が利用できません');
          return resolve();
        }

        // MCPシステムの機能拡張
        this._extendMCP();

        // 各モジュールのMCP初期化を実行
        Promise.all([
          this._initializeTypingMCP(),
          // 他のMCPモジュールの初期化
        ])
          .then(() => {
            console.log('[MCPUtils] MCPの初期化が完了しました');
            resolve();
          })
          .catch((error) => {
            console.error('[MCPUtils] MCP初期化エラー:', error);
            reject(error);
          });
      } catch (error) {
        console.error('[MCPUtils] MCP初期化の例外:', error);
        reject(error);
      }
    });
  }

  /**
   * MCPシステムを拡張する
   * @private
   */
  _extendMCP() {
    if (typeof window === 'undefined' || !window._mcp) return;

    const mcp = window._mcp;

    // MCPハンドラー登録機能（存在しない場合のみ追加）
    if (!mcp.registerHandler) {
      mcp.handlers = new Map();

      mcp.registerHandler = function (eventName, handler) {
        if (typeof handler !== 'function') {
          console.error('[MCP] ハンドラは関数である必要があります:', eventName);
          return;
        }

        this.handlers.set(eventName, handler);
        console.log(`[MCP] ハンドラを登録しました: ${eventName}`);
      };

      // コールバック付きsend機能の拡張
      const originalSend = mcp.send || mcp.sendMessage;
      mcp.send = function (channel, data, callback) {
        // ハンドラの実行
        const handler = this.handlers.get(channel);
        if (handler) {
          try {
            const result = handler(data);
            if (callback && typeof callback === 'function') {
              callback(result);
            }
            return result;
          } catch (error) {
            console.error(`[MCP] ハンドラ実行エラー (${channel}):`, error);
            if (callback && typeof callback === 'function') {
              callback({ success: false, error: error.message });
            }
          }
          return null;
        }

        // ハンドラがない場合は元の送信処理を実行
        if (originalSend) {
          originalSend.call(this, channel, data);
        } else {
          console.warn(`[MCP] チャンネル ${channel} のハンドラがありません`);
        }

        if (callback && typeof callback === 'function') {
          callback(null);
        }
        return null;
      };

      // イベントリスナー機能の追加
      mcp.eventListeners = new Map();

      mcp.on = function (eventName, listener) {
        if (typeof listener !== 'function') {
          console.error('[MCP] リスナーは関数である必要があります:', eventName);
          return;
        }

        const listeners = this.eventListeners.get(eventName) || [];
        listeners.push(listener);
        this.eventListeners.set(eventName, listeners);

        // 登録解除関数を返す
        return () => {
          const currentListeners = this.eventListeners.get(eventName) || [];
          const index = currentListeners.indexOf(listener);
          if (index !== -1) {
            currentListeners.splice(index, 1);
            this.eventListeners.set(eventName, currentListeners);
          }
        };
      };

      mcp.off = function (eventName, listener) {
        const listeners = this.eventListeners.get(eventName) || [];
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
          this.eventListeners.set(eventName, listeners);
        }
      };

      // 元のsendMessageをラップして、イベントリスナーに通知するようにする
      const originalSendMessage = mcp.sendMessage;
      mcp.sendMessage = function (channel, data) {
        // 元の送信処理を実行
        if (originalSendMessage) {
          originalSendMessage.call(this, channel, data);
        }

        // リスナーに通知
        const listeners = this.eventListeners.get(channel) || [];
        listeners.forEach(listener => {
          try {
            listener(data);
          } catch (error) {
            console.error(`[MCP] リスナー実行エラー (${channel}):`, error);
          }
        });
      };
    }

    console.log('[MCPUtils] MCPシステムを拡張しました');
  }

  /**
   * タイピングゲーム用のMCPを初期化する
   * @returns {Promise<void>}
   * @private
   */
  _initializeTypingMCP() {
    return new Promise((resolve) => {
      try {
        // タイピングモデルのインスタンス取得（自動初期化）
        import('./mcp/TypingModelMCP').then(({ getTypingModelInstance }) => {
          getTypingModelInstance();
          console.log('[MCPUtils] タイピングゲームのMCPを初期化しました');
          resolve();
        }).catch((error) => {
          console.error('[MCPUtils] タイピングゲームのMCP初期化エラー:', error);
          // エラーが発生しても全体の初期化は継続
          resolve();
        });
      } catch (error) {
        console.error('[MCPUtils] タイピングゲームのMCP初期化の例外:', error);
        resolve();
      }
    });
  }

  /**
   * MCPが利用可能かどうかを確認する
   * @returns {boolean} MCPが利用可能な場合はtrue
   */
  isMCPAvailable() {
    return typeof window !== 'undefined' && !!window._mcp;
  }
}

// シングルトンインスタンスを作成
const mcpUtilsInstance = new MCPUtils();

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

    try {
      // Web Workerからのデータを受け入れられるよう、データ形式を標準化
      const typingMetric = {
        timestamp: Date.now(),
        ...typingData,
        contextType: 'typing-event',
        source: typingData.fromWorker ? 'worker' : 'main-thread',
        perfData: {
          latency: typingData.latency || null,
          frameTime: typingData.frameTime || null,
          processingTime: typingData.processingTime || null,
          isHighFrequency: typingData.isHighFrequency || false
        }
      };

      // バッファリングして一度に送信する（パフォーマンス向上のため）
      this.metricsBuffer.push(typingMetric);

      // 高リフレッシュレート環境の場合、小さめのバッチサイズでフラッシュ
      const batchThreshold = typingData.isHighFrequency ? 10 : 20;

      // バッファが一定量たまったらまとめて送信
      if (this.metricsBuffer.length >= batchThreshold) {
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

    try {
      const metric = {
        name: metricName,
        value,
        timestamp: Date.now(),
        contextType: 'performance-metric'
      };

      // パフォーマンスメトリクスはバッファリングせず直接送信
      this.sendToMCP('performance:metric', metric);
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
        setInterval(() => {
          this.recordPerformanceMetric('memory', {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          });
        }, 10000);
      }

      // ロング・タスクの検出
      if (typeof PerformanceObserver === 'function' &&
        PerformanceObserver.supportedEntryTypes &&
        PerformanceObserver.supportedEntryTypes.includes('longtask')) {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.recordPerformanceMetric('longTask', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
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
}

// シングルトンインスタンスを作成
const contextManagerInstance = new MCPContextManager();

/**
 * React用のMCPインテグレーションフック
 * コンポーネント内でMCP機能を使用するためのフック
 */
export const useMCPContext = () => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // コンポーネントマウント時にMCPマネージャーを初期化
    contextManagerInstance.initialize().then(() => {
      setIsActive(contextManagerInstance.mcpEnabled);
    });

    // クリーンアップ関数
    return () => {
      contextManagerInstance.flushMetricsBuffer();
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
      contextManagerInstance.registerComponentRender(componentName);
    } catch (err) {
      // エラー処理を省略（MCP機能は非クリティカル）
    }
  }, []);

  return {
    isActive,
    recordTypingInput: contextManagerInstance.recordTypingInput.bind(contextManagerInstance),
    recordGameEvent: contextManagerInstance.recordGameEvent.bind(contextManagerInstance),
    recordPerformanceMetric: contextManagerInstance.recordPerformanceMetric.bind(contextManagerInstance),
    recordUXElement: contextManagerInstance.recordUXElement.bind(contextManagerInstance)
  };
};

/**
 * MCP UI表示コンポーネント
 * MCPの状態をUI上に表示するためのコンポーネント
 */
export const MCPStatusDisplay = ({ position = 'bottom-right' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState({
    connected: contextManagerInstance.mcpEnabled,
    metricsCount: 0,
    lastUpdate: Date.now()
  });

  // ステータス更新
  useEffect(() => {
    contextManagerInstance.initialize();

    const updateInterval = setInterval(() => {
      setStatus({
        connected: contextManagerInstance.mcpEnabled,
        metricsCount: contextManagerInstance.metricsBuffer.length,
        lastUpdate: Date.now()
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
        onClick={() => contextManagerInstance.flushMetricsBuffer()}
      >
        メトリクス送信
      </div>
    </div>
  );
};

// MCPユーティリティの公開メソッド
const mcpUtils = {
  initialize: mcpUtilsInstance.initialize.bind(mcpUtilsInstance),
  recordTypingInput: contextManagerInstance.recordTypingInput.bind(contextManagerInstance),
  recordGameEvent: contextManagerInstance.recordGameEvent.bind(contextManagerInstance),
  recordPerformanceMetric: contextManagerInstance.recordPerformanceMetric.bind(contextManagerInstance),
  recordUXElement: contextManagerInstance.recordUXElement.bind(contextManagerInstance),
  flushMetricsBuffer: contextManagerInstance.flushMetricsBuffer.bind(contextManagerInstance),
  useMCPContext,
  MCPStatusDisplay
};

export default mcpUtils;