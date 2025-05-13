'use client';

import React, { useState, useEffect } from 'react';
import { MCPCommandTypes } from '../utils/MCPUtils';
import { TypingModelMCP, getTypingModelInstance } from '../utils/mcp/TypingModelMCP';
import { TypingEvents, TypingCommands } from '../utils/mcp/TypingProtocol';

/**
 * MCP（Model Context Protocol）イニシャライザー
 * MCPアーキテクチャのサーバー接続とグローバル初期化を管理するコンポーネント
 * 
 * このコンポーネントはアプリケーションのルートに配置され、
 * MCPサーバーとの接続を確立し、必要な初期化処理を行います。
 */
const MCPInitializer = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('initializing');

  // MCPの初期化とサーバー接続
  useEffect(() => {
    async function initializeMCP() {
      try {
        setConnectionStatus('connecting');
        console.log('[MCPInitializer] MCPサーバーとの接続を試みています...');

        // グローバルMCPオブジェクトの確認
        if (typeof window === 'undefined') {
          console.warn('[MCPInitializer] サーバーサイドでは初期化をスキップします');
          setConnectionStatus('skipped');
          return;
        }

        // MCPグローバルオブジェクトの初期化
        if (!window._mcp) {
          window._mcp = {
            isConnected: false,
            commands: {},
            handlers: new Map(),
            eventListeners: new Map()
          };

          // MCP内部APIの実装
          window._mcp.send = function (channel, data, callback) {
            const handler = this.handlers.get(channel);
            if (handler) {
              try {
                const result = handler(data);
                if (callback) callback(result);

                // イベント発火（自動伝搬）
                this.emit(channel, data);

                return result;
              } catch (error) {
                console.error(`[MCP] ハンドラエラー (${channel}):`, error);
              }
            } else {
              // デバッグモードでないときは警告を表示しない
              if (this.debug) {
                console.warn(`[MCP] チャンネル未登録: ${channel}`);
              }
            }
            if (callback) callback(null);
            return null;
          };

          window._mcp.registerHandler = function (eventName, handler) {
            this.handlers.set(eventName, handler);
            if (this.debug) {
              console.log(`[MCP] ハンドラ登録: ${eventName}`);
            }
          };

          window._mcp.on = function (eventName, listener) {
            const listeners = this.eventListeners.get(eventName) || [];
            listeners.push(listener);
            this.eventListeners.set(eventName, listeners);

            return () => this.off(eventName, listener);
          };

          window._mcp.off = function (eventName, listener) {
            const listeners = this.eventListeners.get(eventName) || [];
            const index = listeners.indexOf(listener);
            if (index !== -1) {
              listeners.splice(index, 1);
              this.eventListeners.set(eventName, listeners);
            }
          };

          // イベント発火機能の追加
          window._mcp.emit = function (eventName, data) {
            const listeners = this.eventListeners.get(eventName) || [];
            listeners.forEach(listener => {
              try {
                listener(data);
              } catch (error) {
                console.error(`[MCP] イベントリスナーエラー (${eventName}):`, error);
              }
            });
          };

          // デバッグモードの設定
          window._mcp.debug = process.env.NODE_ENV === 'development' && false; // 警告を抑制するためにfalseに設定
        }

        // MCP拡張モジュールの読み込み
        try {
          // タイピングモジュールの登録
          await registerTypingMCPHandlers();

          // パフォーマンスメトリクス関連のハンドラー登録
          registerPerformanceHandlers();

          // コンポーネントレンダリング関連のハンドラー登録
          registerComponentHandlers();

          // ゲームイベントのハンドラー登録
          registerGameEventHandlers();

          // メトリクスバッチ処理のハンドラー登録
          registerMetricsHandlers();

          // 他のモジュールの登録処理をここに追加

          console.log('[MCPInitializer] MCPハンドラーの登録が完了しました');
        } catch (error) {
          console.error('[MCPInitializer] MCPモジュール登録エラー:', error);
        }

        // 接続状態を更新
        window._mcp.isConnected = true;
        setIsConnected(true);
        setConnectionStatus('connected');

        console.log('[MCPInitializer] MCPの初期化が完了しました');
        setIsInitialized(true);
      } catch (error) {
        console.error('[MCPInitializer] MCP初期化エラー:', error);
        setConnectionStatus('error');
      }
    }

    initializeMCP();

    // クリーンアップ関数
    return () => {
      if (typeof window !== 'undefined' && window._mcp) {
        window._mcp.isConnected = false;
        console.log('[MCPInitializer] MCP接続をクリーンアップしました');
      }
    };
  }, []);

  /**
   * パフォーマンス関連のハンドラー登録
   */
  function registerPerformanceHandlers() {
    if (typeof window === 'undefined' || !window._mcp) return;

    // パフォーマンスメトリクス用のダミーハンドラ
    const perfHandler = (data) => {
      // パフォーマンスデータを処理するロジック（必要に応じて実装）
      return { received: true };
    };

    // パフォーマンスメトリクス用ハンドラー登録
    window._mcp.registerHandler('performance:metric', perfHandler);
  }

  /**
   * コンポーネント関連のハンドラー登録
   */
  function registerComponentHandlers() {
    if (typeof window === 'undefined' || !window._mcp) return;

    // コンポーネントレンダリング用のダミーハンドラ
    const componentHandler = (data) => {
      return { received: true };
    };

    // コンポーネントレンダリング用ハンドラー登録
    window._mcp.registerHandler('component:render', componentHandler);
  }

  /**
   * ゲームイベント関連のハンドラー登録
   */
  function registerGameEventHandlers() {
    if (typeof window === 'undefined' || !window._mcp) return;

    // ゲームイベント用のダミーハンドラ
    const gameEventHandler = (data) => {
      return { received: true };
    };

    // ゲームイベント用ハンドラー登録
    window._mcp.registerHandler('game:event', gameEventHandler);
  }

  /**
   * メトリクスバッチ関連のハンドラー登録
   */
  function registerMetricsHandlers() {
    if (typeof window === 'undefined' || !window._mcp) return;

    // メトリクスバッチ用のダミーハンドラ
    const metricsHandler = (data) => {
      return { received: true };
    };

    // メトリクスバッチ用ハンドラー登録
    window._mcp.registerHandler('metrics:batch', metricsHandler);
  }

  /**
   * タイピングMCPハンドラーの登録
   * MCPモジュールにタイピング関連のハンドラーを登録する
   */
  async function registerTypingMCPHandlers() {
    if (typeof window === 'undefined' || !window._mcp) return;

    try {
      // タイピングモデルのインスタンス作成（シングルトンを使用）
      const typingModel = getTypingModelInstance();

      // モデルがアクティブかどうかチェック
      if (!typingModel) {
        throw new Error('タイピングモデルのインスタンスが作成できませんでした');
      }

      // グローバルタイピングイベントリスナーの登録
      window._mcp.on(TypingEvents.STATE_UPDATED, (data) => {
        if (window._mcp.debug) {
          console.log('[MCP] タイピング状態更新:', data);
        }
      });

      window._mcp.on(TypingEvents.INPUT_PROCESSED, (data) => {
        if (window._mcp.debug) {
          console.log('[MCP] タイピング入力処理:', data);
        }
      });

      window._mcp.on(TypingEvents.ERROR, (data) => {
        console.error('[MCP] タイピングエラー:', data);
      });

      // 各種タイピング関連ハンドラーの登録
      const typingHandler = (data) => {
        return { received: true };
      };

      // すべてのタイピング関連イベントのハンドラを登録
      window._mcp.registerHandler('typing:displayUpdated', typingHandler);
      window._mcp.registerHandler('typing:inputProcessed', typingHandler);
      window._mcp.registerHandler('typing:statsUpdated', typingHandler);
      window._mcp.registerHandler('typing:problemLoaded', typingHandler);
      window._mcp.registerHandler('typing:problemCompleted', typingHandler);

      // グローバルに保存（デバッグ用）
      if (process.env.NODE_ENV === 'development') {
        window._typingMCPModel = typingModel;
      }

      console.log('[MCPInitializer] タイピングMCPモデルを初期化しました');

      // 初期化完了イベントを発行
      window._mcp.emit('mcp:system:initialized', { module: 'typing', timestamp: Date.now() });

      return true;
    } catch (error) {
      console.error('[MCPInitializer] タイピングMCPモデル初期化エラー:', error);
      throw error;
    }
  }

  // 接続状態に応じたスタイル
  const getStatusStyle = () => {
    switch (connectionStatus) {
      case 'connected':
        return { backgroundColor: '#4caf50' };
      case 'connecting':
        return { backgroundColor: '#ff9800' };
      case 'error':
        return { backgroundColor: '#f44336' };
      default:
        return { backgroundColor: '#9e9e9e' };
    }
  };

  return (
    <>
      {children}

      {/* MCP接続ステータスインジケータ（開発環境のみ表示） */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            zIndex: 9999,
            cursor: 'pointer',
            boxShadow: '0 0 4px rgba(0,0,0,0.3)',
            ...getStatusStyle()
          }}
          title={`MCP接続状態: ${connectionStatus}`}
          onClick={() => {
            if (typeof window !== 'undefined' && window._mcp && window._mcp.debug) {
              console.log('[MCP] 現在の状態:', {
                接続状態: window._mcp.isConnected,
                ハンドラー: [...window._mcp.handlers.keys()],
                リスナー: [...window._mcp.eventListeners.keys()],
                タイピングモデル: window._typingMCPModel
              });
            }
          }}
        />
      )}
    </>
  );
};

export default MCPInitializer;