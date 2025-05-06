import './globals.css';
import { fontClasses } from './fonts';  // fonts.jsからfontClassesをインポート
import MCPInitializer from '../components/MCPInitializer';

export const metadata = {
  title: 'タイピング練習ゲーム',
  description: 'Next.jsで作成されたタイピング練習ゲーム',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        {/* ランタイムエラーを抑制するためのスクリプト */}
        <script dangerouslySetInnerHTML={{
          __html: `
            // chrome拡張機能やLive Previewによるエラーメッセージを抑制
            window.addEventListener('error', function(event) {
              if (event.message && event.message.includes('runtime.lastError') && 
                  event.message.includes('message channel closed')) {
                event.preventDefault();
                event.stopPropagation();
                return true;
              }
            }, true);
          `
        }} />

        {/* MCP初期化スクリプト */}
        <script dangerouslySetInnerHTML={{
          __html: `
            // MCPオブジェクトの初期化
            window._mcp = window._mcp || {
              send: function(channel, data) {
                console.log('[MCP] メッセージ送信:', channel, data);
                return true;
              },
              sendMessage: function(channel, data) {
                console.log('[MCP] メッセージ送信:', channel, data);
                return true;
              },
              setContext: function(context) {
                console.log('[MCP] コンテキスト設定:', context);
                this.context = context;
                return true;
              },
              context: { id: 'local-session-' + Date.now() },
              handlers: new Map(),
              eventListeners: new Map()
            };
            console.log('[MCP] 初期化完了');
          `
        }} />
      </head>
      <body
        className={fontClasses}  // Geistの代わりにfonts.jsで定義したフォントクラスを使用
        suppressHydrationWarning
        style={{
          position: 'relative',
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          backgroundColor: '#111'
        }}
      >
        {/* MCPサーバー接続初期化 - childrenを渡す */}
        <MCPInitializer>
          {children}
        </MCPInitializer>
      </body>
    </html>
  );
}
