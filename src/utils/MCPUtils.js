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
  isMCPAvailable(detailed = false) {
    try {
      const basicCheck = typeof window !== 'undefined' && !!window._mcp;

      if (!detailed) {
        return basicCheck;
      }

      // 詳細なステータスチェック
      if (!basicCheck) {
        return {
          available: false,
          status: 'not_available',
          reason: 'MCP object not found in window',
          time: Date.now()
        };
      }

      // MCP APIの状態チェック
      const apiCheck = typeof window._mcp.send === 'function' &&
        typeof window._mcp.on === 'function';

      // コンテキスト状態の確認
      const contextCheck = contextManagerInstance &&
        contextManagerInstance.context &&
        contextManagerInstance.context.id;

      // 接続状態の判定
      let connectionStatus = 'unknown';
      if (apiCheck && contextCheck) {
        connectionStatus = 'connected';
      } else if (apiCheck && !contextCheck) {
        connectionStatus = 'api_available_no_context';
      } else if (!apiCheck) {
        connectionStatus = 'api_incomplete';
      }

      return {
        available: apiCheck,
        status: connectionStatus,
        apiMethods: {
          send: typeof window._mcp.send === 'function',
          on: typeof window._mcp.on === 'function',
          off: typeof window._mcp.off === 'function',
          setContext: typeof window._mcp.setContext === 'function'
        },
        hasContext: !!contextCheck,
        time: Date.now()
      };
    } catch (err) {
      if (detailed) {
        return {
          available: false,
          status: 'error',
          error: err.message,
          time: Date.now()
        };
      }
      return false;
    }
  }

  /**
   * 接続状態を詳細に確認する
   * @returns {Promise<Object>} 接続状態の詳細情報
   */
  async checkConnection() {
    const status = this.isMCPAvailable(true);

    // 基本チェックに失敗した場合はそのまま返す
    if (!status.available) {
      return status;
    }

    // 接続のアクティブ状態を確認する簡易的なping/pong
    try {
      let pingSuccess = false;

      // Promiseベースのping確認
      const pingResult = await new Promise((resolve) => {
        // タイムアウト設定
        const timeoutId = setTimeout(() => {
          resolve({ success: false, reason: 'timeout' });
        }, 1000);

        // pingリクエスト
        if (window._mcp.send) {
          const pingHandler = (response) => {
            clearTimeout(timeoutId);
            window._mcp.off?.('pong', pingHandler);
            resolve({ success: true, response });
          };

          // pongリスナー登録
          window._mcp.on?.('pong', pingHandler);

          // ping送信
          window._mcp.send('ping', { timestamp: Date.now() });
        } else {
          clearTimeout(timeoutId);
          resolve({ success: false, reason: 'no_send_method' });
        }
      });

      // ping結果を状態に追加
      status.pingCheck = pingResult;
      status.alive = pingResult.success;

      return status;
    } catch (err) {
      status.pingCheck = { success: false, error: err.message };
      status.alive = false;
      return status;
    }
  }
}

/**
 * MCPContextManager
 * MCPのコンテキスト管理とメトリクス収集を行うクラス
 * リファクタリング分析目的のみに使用し、タイピング処理のレスポンスには影響を与えない設計
 */
class MCPContextManager {
  constructor() {
    // MCPの有効/無効フラグ
    this.mcpEnabled = typeof window !== 'undefined' && !!window._mcp;

    // MCPのコンテキスト情報
    this.context = {
      id: null,           // セッションID
      type: null,         // コンテキストタイプ
      modelName: null,    // モデル名
      modelVersion: null, // モデルバージョン
      metadata: {}        // メタデータ
    };

    // メトリクスバッファ（一括送信のため）
    this.metricsBuffer = [];

    // 分析用データ
    this.analyticsData = {
      startTime: Date.now(),
      totalEvents: 0,
      lastBatchTime: null,
      batchCount: 0,
      eventTypes: {}
    };

    // バックグラウンド処理フラグ
    this.isBackgroundProcessing = false;

    // WEB WORKERのサポート確認
    this.workerSupported = typeof Worker !== 'undefined';
    this.worker = null;

    console.log(`[MCP] 初期化完了 (有効: ${this.mcpEnabled}, Worker: ${this.workerSupported ? 'サポート' : '未サポート'})`);
  }

  /**
   * 初期化処理
   */
  initialize() {
    // 初期化処理（必要に応じて実装）
    return Promise.resolve();
  }

  /**
   * MCPコンテキストを設定
   * @param {Object} contextData - コンテキスト情報
   */
  setContext(contextData) {
    if (!this.mcpEnabled || !contextData) return;

    try {
      // コンテキスト情報を設定
      this.context = {
        ...this.context,
        ...contextData,
        updatedAt: new Date().toISOString()
      };

      // MCP側にコンテキストを通知（分析専用）
      if (window._mcp) {
        window._mcp.setContext?.(this.context);
        console.log('[MCP] コンテキストを設定しました:', this.context);
      }
    } catch (err) {
      console.error('[MCP] コンテキスト設定エラー:', err);
    }
  }

  /**
   * MCPが有効かどうかを返す
   */
  get isActive() {
    return this.mcpEnabled && !!this.context.id;
  }

  /**
   * タイピング入力をMCPに記録する（分析専用）
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
        isAnalyticsOnly: typingData.isAnalyticsOnly || false
      };

      // バッファリングして一度に送信
      this.metricsBuffer.push(typingMetric);

      // 分析データを更新
      this.analyticsData.totalEvents++;
      const eventType = typingData.isBackspace ? 'backspace' : 'char';
      this.analyticsData.eventTypes[eventType] = (this.analyticsData.eventTypes[eventType] || 0) + 1;

      // 分析目的の場合は大きめのバッチサイズでフラッシュ
      const batchThreshold = typingData.isHighFrequency ? 50 : 100;

      // バッファが一定量たまったらまとめて送信
      // ただし、バックグラウンド処理中は重複処理を避ける
      if (this.metricsBuffer.length >= batchThreshold && !this.isBackgroundProcessing) {
        this._scheduleBackgroundFlush();
      }
    } catch (err) {
      console.error('[MCP] タイピング記録エラー:', err);
    }
  }

  /**
   * ゲームイベントを記録する（欠落していたメソッド）
   * @param {Object} eventData - ゲームイベントデータ
   */
  recordGameEvent(eventData) {
    if (!this.mcpEnabled) return;

    try {
      const gameEventMetric = {
        timestamp: Date.now(),
        ...eventData,
        contextType: 'game-event',
        isAnalyticsOnly: true
      };

      this.metricsBuffer.push(gameEventMetric);
      this.analyticsData.totalEvents++;

      // 必要に応じて処理をスケジュール
      if (this.metricsBuffer.length >= 50 && !this.isBackgroundProcessing) {
        this._scheduleBackgroundFlush();
      }
    } catch (err) {
      console.error('[MCP] ゲームイベント記録エラー:', err);
    }
  }

  /**
   * パフォーマンスメトリクスを記録する（欠落していたメソッド）
   * @param {Object} perfData - パフォーマンスデータ
   */
  recordPerformanceMetric(perfData) {
    if (!this.mcpEnabled) return;

    try {
      const perfMetric = {
        timestamp: Date.now(),
        ...perfData,
        contextType: 'performance-metric',
        isAnalyticsOnly: true
      };

      this.metricsBuffer.push(perfMetric);
      this.analyticsData.totalEvents++;

      // パフォーマンスメトリクスは即時フラッシュしない
      if (this.metricsBuffer.length >= 100 && !this.isBackgroundProcessing) {
        this._scheduleBackgroundFlush();
      }
    } catch (err) {
      console.error('[MCP] パフォーマンス記録エラー:', err);
    }
  }

  /**
   * UX要素を記録する（欠落していたメソッド）
   * @param {Object} uxData - UXデータ
   */
  recordUXElement(uxData) {
    if (!this.mcpEnabled) return;

    try {
      const uxMetric = {
        timestamp: Date.now(),
        ...uxData,
        contextType: 'ux-element',
        isAnalyticsOnly: true
      };

      this.metricsBuffer.push(uxMetric);
      this.analyticsData.totalEvents++;

      // UXメトリクスは他のメトリクスと共にバッチ処理
      if (this.metricsBuffer.length >= 50 && !this.isBackgroundProcessing) {
        this._scheduleBackgroundFlush();
      }
    } catch (err) {
      console.error('[MCP] UX要素記録エラー:', err);
    }
  }

  /**
   * コンポーネントレンダリングを記録する
   * @param {string} componentName - コンポーネント名
   */
  registerComponentRender(componentName) {
    if (!this.mcpEnabled) return;

    try {
      this.recordUXElement({
        type: 'component-render',
        componentName,
        timestamp: Date.now()
      });
    } catch (err) {
      // エラーを無視（非クリティカル）
    }
  }

  /**
   * メトリクスバッファを強制的にフラッシュ
   */
  flushMetricsBuffer() {
    if (this.metricsBuffer.length > 0 && !this.isBackgroundProcessing) {
      this._scheduleBackgroundFlush();
    }
    return Promise.resolve();
  }

  /**
   * バックグラウンドでメトリクスバッファをフラッシュするようスケジュール
   * @private
   */
  _scheduleBackgroundFlush() {
    // すでにバックグラウンド処理中ならスケジュールしない
    if (this.isBackgroundProcessing) return;

    this.isBackgroundProcessing = true;

    // メインスレッドをブロックしないよう、非同期でフラッシュ
    setTimeout(() => {
      this._flushMetricsBufferAsync();
    }, 0);
  }

  /**
   * メトリクスバッファを非同期でフラッシュ（バックグラウンド処理）
   * @private
   */
  async _flushMetricsBufferAsync() {
    try {
      const metrics = [...this.metricsBuffer];
      this.metricsBuffer = [];

      this.analyticsData.lastBatchTime = Date.now();
      this.analyticsData.batchCount++;

      // ワーカーが使える場合はワーカーに処理を委譲
      if (this.workerSupported && !this.worker) {
        // 遅延ロード - 初回処理時のみワーカーを初期化
        try {
          // TODO: Web Workerを作成する場合はここに実装
          // 現状は直接処理
          await this._sendMetricsDirectly(metrics);
        } catch (err) {
          console.error('[MCP] Worker初期化エラー:', err);
          // フォールバック: 直接送信
          await this._sendMetricsDirectly(metrics);
        }
      } else {
        // ワーカーが利用できない場合は直接処理
        await this._sendMetricsDirectly(metrics);
      }
    } catch (err) {
      console.error('[MCP] メトリクス送信エラー:', err);
    } finally {
      // 処理完了フラグを設定
      this.isBackgroundProcessing = false;

      // バッファにまだ十分なデータがあれば再度フラッシュをスケジュール
      if (this.metricsBuffer.length >= 50) {
        this._scheduleBackgroundFlush();
      }
    }
  }

  /**
   * メトリクスを直接MCPに送信（ワーカーなし版）
   * @param {Array} metrics - 送信するメトリクスの配列
   * @private
   */
  async _sendMetricsDirectly(metrics) {
    if (!this.mcpEnabled || !window._mcp || !metrics || metrics.length === 0) {
      return;
    }

    // 開発環境では詳細ログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MCP] ${metrics.length}件のデータを送信（分析用）`);
    }

    try {
      // 非同期でMCPに送信
      if (window._mcp.sendMetrics) {
        // バッチモードで送信
        await window._mcp.sendMetrics(metrics);
      } else {
        // 互換モード: 個別送信
        for (const metric of metrics) {
          window._mcp.send?.('metrics', metric);
        }
      }
    } catch (err) {
      console.error('[MCP] メトリクス送信エラー:', err);
      // エラー時はメトリクスを破棄（レスポンスへの影響を避ける）
    }
  }
}

// シングルトンインスタンスを作成
const contextManagerInstance = new MCPContextManager();
// MCPUtilsのシングルトンインスタンスを作成
const mcpUtilsInstance = new MCPUtils();

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