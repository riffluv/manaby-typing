'use client';

/**
 * MCPInitializer
 * MCPサーバーとの接続を管理し、接続状態を監視・表示するコンポーネント
 * リファクタリング済み（2025年5月7日）
 *
 * 環境変数 NEXT_PUBLIC_USE_MCP によって制御可能:
 * - 開発環境: true - MCPサーバーに接続
 * - 本番環境: false - MCPサーバー無効化
 */

import { useEffect, useState, useCallback } from 'react';
import MCPUtils from '@/utils/MCPUtils';

// 環境変数からMCPの有効/無効を取得
const USE_MCP = process.env.NEXT_PUBLIC_USE_MCP !== 'false';

/**
 * MCPサーバーとの接続状態を管理し、必要に応じて再接続を試みるコンポーネント
 */
const MCPInitializer = ({ children }) => {
  // 状態管理
  const [initialized, setInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [retryInfo, setRetryInfo] = useState({
    count: 0,
    maxRetries: 5,
    nextRetryAt: null,
  });
  const [isDebugMode, setIsDebugMode] = useState(false); // 詳細ステータス表示切り替え用

  /**
   * MCP接続の初期化
   */
  const initializeMCP = useCallback(async () => {
    try {
      console.log('[MCPInitializer] MCP初期化を試みます...');
      const initResult = await MCPUtils.initialize();

      // 接続状態を確認
      if (typeof window !== 'undefined' && window._mcp) {
        // 接続成功
        setConnectionStatus('connected');
        console.log('[MCPInitializer] MCP接続に成功しました', initResult);

        // 接続状態の監視を開始
        startConnectionMonitoring();

        // 再試行情報をリセット
        setRetryInfo((prev) => ({ ...prev, count: 0, nextRetryAt: null }));
      } else {
        // 接続失敗
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
  }, []);

  /**
   * 接続状態の定期監視
   */
  const startConnectionMonitoring = useCallback(() => {
    // 前回のタイマーIDを保持するための参照
    let intervalId = null;

    // 定期的に接続状態を確認
    const startMonitoring = () => {
      intervalId = setInterval(async () => {
        // MCPの接続状態をチェック
        const isConnected = typeof window !== 'undefined' && window._mcp;

        if (!isConnected && connectionStatus === 'connected') {
          // 接続が切断された場合
          console.warn('[MCPInitializer] MCP接続が切断されました');
          setConnectionStatus('disconnected');
          scheduleReconnect();
        } else if (isConnected) {
          // 接続が生きているか詳細チェック
          try {
            // 修正: MCPUtilsのexportされているAPIを正しく使用する
            // isMCPAvailableではなく、MCPの基本的な存在チェック＋pingを実装
            const mcpExists = typeof window !== 'undefined' && !!window._mcp;
            let alive = mcpExists;

            if (mcpExists) {
              // pingの実装（単純化した接続チェック）
              try {
                // まずMCPの応答性をチェックする簡易テスト
                if (typeof window._mcp.send === 'function') {
                  window._mcp.send('ping', { timestamp: Date.now() });
                }

                // 応答したということはとりあえず生きている
                alive = true;
              } catch (pingError) {
                console.warn(
                  '[MCPInitializer] MCP接続テストエラー:',
                  pingError
                );
                alive = false;
              }
            }

            if (!alive && connectionStatus === 'connected') {
              console.warn('[MCPInitializer] MCP接続が応答しません');
              setConnectionStatus('unresponsive');
              scheduleReconnect();
            }
          } catch (err) {
            console.error('[MCPInitializer] 接続確認エラー:', err);
          }
        }
      }, 5000); // 5秒ごとにチェック
    };

    // 監視開始
    startMonitoring();

    // クリーンアップ関数を返す
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [connectionStatus]);

  /**
   * 再接続をスケジュール
   */
  const scheduleReconnect = useCallback(() => {
    setRetryInfo((prev) => {
      // 最大再試行回数を超えた場合は中止
      if (prev.count >= prev.maxRetries) {
        console.log(
          `[MCPInitializer] 最大再試行回数(${prev.maxRetries}回)に達しました。接続をあきらめます。`
        );
        return { ...prev, nextRetryAt: null };
      }

      // 指数バックオフで再試行間隔を延ばす（1秒、2秒、4秒、8秒...）
      const nextRetryCount = prev.count + 1;
      const delay = Math.min(1000 * Math.pow(2, prev.count), 30000); // 最大30秒
      const nextRetryAt = Date.now() + delay;

      console.log(
        `[MCPInitializer] ${delay}ms後に再接続を試みます(${nextRetryCount}/${prev.maxRetries})`
      );

      // 再接続タイマーをセット
      setTimeout(() => {
        initializeMCP();
      }, delay);

      return {
        ...prev,
        count: nextRetryCount,
        nextRetryAt,
      };
    });
  }, [initializeMCP]);
  /**
   * 初期化処理（マウント時に一度だけ実行）
   */
  useEffect(() => {
    // 環境変数に基づいてMCPの初期化を条件付きで行う
    if (USE_MCP) {
      console.log(
        '[MCPInitializer] MCP機能が有効です。MCPサーバー初期化を開始します。'
      );
      initializeMCP();
    } else {
      console.log(
        '[MCPInitializer] MCP機能は無効化されています（本番環境モード）'
      );
      // 本番環境ではMCPなしでも動作するように初期化完了とする
      setInitialized(true);
      setConnectionStatus('disabled');
    }

    // クリーンアップ関数
    return () => {
      // 必要なクリーンアップ処理があればここに記述
    };
  }, [initializeMCP]);

  /**
   * デバッグモード切り替え
   */
  const toggleDebugMode = useCallback(() => {
    setIsDebugMode((prev) => !prev);
  }, []);

  /**
   * 手動再接続
   */
  const handleManualReconnect = useCallback(() => {
    // 再試行カウントをリセットして再接続
    setRetryInfo((prev) => ({ ...prev, count: 0 }));
    setConnectionStatus('connecting');
    initializeMCP();
  }, [initializeMCP]);

  /**
   * MCPステータス表示コンポーネント
   */
  const MCPStatusDisplay = () => {
    // 接続状態によってスタイルを変更
    let statusColor = '#4CAF50'; // デフォルト：緑（接続済み）
    let statusText = 'MCP接続中';

    switch (connectionStatus) {
      case 'connected':
        statusColor = '#4CAF50'; // 緑
        statusText = 'MCP接続中';
        break;
      case 'connecting':
        statusColor = '#2196F3'; // 青
        statusText = 'MCP接続中...';
        break;
      case 'disconnected':
        statusColor = '#F44336'; // 赤
        statusText = 'MCP未接続';
        break;
      case 'error':
        statusColor = '#FF9800'; // オレンジ
        statusText = 'MCP接続エラー';
        break;
      case 'unresponsive':
        statusColor = '#FF9800'; // オレンジ
        statusText = 'MCP応答なし';
        break;
      case 'disabled':
        statusColor = '#9E9E9E'; // グレー
        statusText = 'MCP無効（本番環境）';
        break;
      default:
        statusColor = '#9E9E9E'; // グレー
        statusText = 'MCP状態不明';
    }

    // 環境変数でMCPが無効化されている場合は表示しない
    if (!USE_MCP) {
      return null;
    }

    // 基本的なスタイル（インラインスタイルは例外的に使用）
    const baseStyle = {
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(0,0,0,0.7)',
      color: statusColor,
      padding: '3px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 1000,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      flexDirection: 'column',
    };

    // インジケーターのスタイル
    const indicatorStyle = {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: statusColor,
      display: 'inline-block',
      marginRight: '5px',
    };

    // 再試行情報の表示
    const renderRetryInfo = () => {
      if (retryInfo.nextRetryAt && connectionStatus !== 'connected') {
        const secondsRemaining = Math.max(
          0,
          Math.floor((retryInfo.nextRetryAt - Date.now()) / 1000)
        );
        return (
          <div style={{ fontSize: '10px', marginTop: '5px' }}>
            再試行: {retryInfo.count}/{retryInfo.maxRetries}
            {secondsRemaining > 0 ? ` (${secondsRemaining}秒後)` : ''}
          </div>
        );
      }
      return null;
    };

    // デバッグ情報の表示
    const renderDebugInfo = () => {
      if (!isDebugMode) return null;

      return (
        <div
          style={{
            marginTop: '10px',
            fontSize: '10px',
            textAlign: 'left',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: '5px',
          }}
        >
          <div>状態: {connectionStatus}</div>
          <div>初期化: {initialized ? '完了' : '未完了'}</div>
          <div>
            再試行: {retryInfo.count}/{retryInfo.maxRetries}
          </div>
          <div
            style={{
              marginTop: '5px',
              padding: '2px 5px',
              backgroundColor: 'rgba(33,150,243,0.3)',
              borderRadius: '2px',
              textAlign: 'center',
              cursor: 'pointer',
            }}
            onClick={handleManualReconnect}
          >
            再接続
          </div>
        </div>
      );
    };

    return (
      <div style={baseStyle} onClick={toggleDebugMode}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={indicatorStyle}></div>
          <span>{statusText}</span>
        </div>
        {renderRetryInfo()}
        {renderDebugInfo()}
      </div>
    );
  };
  // 初期化が完了するまでローディング表示
  if (!initialized) {
    // MCPが無効な場合は単純なローディング表示
    if (!USE_MCP) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            color: '#fff',
          }}
        >
          <div>アプリケーションを読み込み中...</div>
        </div>
      );
    }

    // MCP有効時のローディング表示
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          color: '#fff',
        }}
      >
        <div>
          <div>MCPシステムロード中...</div>
          <div
            style={{
              width: '150px',
              height: '4px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '2px',
              marginTop: '10px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '50%',
                height: '100%',
                backgroundColor: '#4CAF50',
                borderRadius: '2px',
                animation: 'mcpLoading 1.5s infinite ease-in-out',
              }}
            />
          </div>
          <style jsx>{`
            @keyframes mcpLoading {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(200%);
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // 初期化完了後に子コンポーネントとステータス表示をレンダリング
  return (
    <>
      {children}
      {/* 本番環境（MCP無効）の場合はステータス表示を省略 */}
      {USE_MCP && <MCPStatusDisplay />}
    </>
  );
};

export default MCPInitializer;
