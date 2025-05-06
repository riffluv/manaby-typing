'use client';

import { useEffect, useState } from 'react';
import MCPUtils from '@/utils/MCPUtils';

/**
 * MCPサーバーとの接続状態を管理し、必要に応じて再接続を試みるコンポーネント
 */
const MCPInitializer = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    let reconnectTimer = null;

    // MCP接続の初期化を行う関数
    const initializeMCP = async () => {
      try {
        console.log('[MCPInitializer] MCP初期化を試みます...');
        await MCPUtils.initialize();

        // 接続状態を確認
        if (typeof window !== 'undefined' && window._mcp) {
          setConnectionStatus('connected');
          console.log('[MCPInitializer] MCP接続に成功しました');

          // 接続状態の定期チェック
          startConnectionMonitoring();
        } else {
          setConnectionStatus('disconnected');
          console.warn('[MCPInitializer] MCPサーバーが利用できません');

          // 再接続を試みる
          scheduleReconnect();
        }

        // 初期化完了フラグを設定
        setInitialized(true);
      } catch (error) {
        console.error('[MCPInitializer] MCP初期化エラー:', error);
        setConnectionStatus('error');

        // 再接続を試みる
        scheduleReconnect();

        // エラーがあっても初期化は完了とみなす（フォールバックモードで動作）
        setInitialized(true);
      }
    };

    // 接続状態の定期監視
    const startConnectionMonitoring = () => {
      const intervalId = setInterval(() => {
        // MCPの接続状態をチェック
        const isConnected = typeof window !== 'undefined' &&
          window._mcp &&
          MCPUtils.isActive;

        if (!isConnected && connectionStatus === 'connected') {
          console.warn('[MCPInitializer] MCP接続が切断されました');
          setConnectionStatus('disconnected');
          scheduleReconnect();
        }
      }, 5000); // 5秒ごとにチェック

      // クリーンアップ関数
      return () => clearInterval(intervalId);
    };

    // 再接続をスケジュール
    const scheduleReconnect = () => {
      // 最大再試行回数を超えた場合は中止
      if (retryCount >= maxRetries) {
        console.log(`[MCPInitializer] 最大再試行回数(${maxRetries}回)に達しました。接続をあきらめます。`);
        return;
      }

      // 前回のタイマーがあればクリア
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      // 指数バックオフで再試行間隔を延ばす
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // 最大10秒
      console.log(`[MCPInitializer] ${delay}ms後に再接続を試みます(${retryCount + 1}/${maxRetries})`);

      reconnectTimer = setTimeout(() => {
        retryCount++;
        initializeMCP();
      }, delay);
    };

    // 初期化実行
    initializeMCP();

    // クリーンアップ処理
    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, []);

  // MCPステータス表示コンポーネント
  const MCPStatusDisplay = () => {
    if (connectionStatus === 'connected') {
      return (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#4CAF50',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          MCP接続中
        </div>
      );
    } else {
      return (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#F44336',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          MCP未接続
        </div>
      );
    }
  };

  // 初期化が完了するまでローディング表示
  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
        <div>ロード中...</div>
      </div>
    );
  }

  // 初期化完了後に子コンポーネントとステータス表示をレンダリング
  return (
    <>
      {children}
      <MCPStatusDisplay />
    </>
  );
};

export default MCPInitializer;