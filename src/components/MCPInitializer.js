'use client';

import { useEffect } from 'react';
import MCPUtils from '../utils/MCPUtils';

/**
 * MCPサーバーとの接続を初期化するコンポーネント
 * ブラウザ環境でのみ実行される
 */
export default function MCPInitializer() {
  useEffect(() => {
    // MCPサーバーとの接続をグローバルに設定
    if (typeof window !== 'undefined') {
      // MCPサーバーとの接続を手動で初期化
      try {
        console.log('[MCP] 接続初期化を開始します');
        
        // window._mcp オブジェクトを作成
        window._mcp = {
          connected: false,
          repository: process.env.NEXT_PUBLIC_GITHUB_REPO || 'https://github.com/riffluv/manaby-typing',
          sendMessage: function(channel, data) {
            // 開発環境でのログ出力を制限（FPSとメモリメトリクスのログは抑制）
            if (process.env.NODE_ENV === 'development') {
              if (!channel.includes('performance:metric')) {
                console.log(`[MCP] メッセージを送信: ${channel}`, data);
              }
            }
            // メッセージをサーバーに送信するロジック
            // この実装は簡易的なもので、実際にはWebSocketなどを使う
          },
          send: function(channel, data) {
            this.sendMessage(channel, data);
          }
        };

        // window.__MCP_CONNECTION__ も設定 (代替接続方法)
        window.__MCP_CONNECTION__ = window._mcp;

        console.log('[MCP] 接続オブジェクトを初期化しました');
        
        // MCPUtilsの初期化を呼び出し
        MCPUtils.initialize().then(() => {
          console.log('[MCP] MCPUtils初期化完了');
          window._mcp.connected = true;
        });
      } catch (err) {
        console.error('[MCP] 接続初期化エラー:', err);
      }
    }
  }, []);

  // UIには何も表示しない
  return null;
}