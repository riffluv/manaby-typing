import './globals.css';
import { fontClasses } from './fonts'; // fonts.jsからfontClassesをインポート
import MCPInitializer from '../components/MCPInitializer';
import { logger, LOG_LEVELS } from '../utils/LogUtils';

// ログ出力を完全に無効化（NONE）に設定
logger.setLogLevel(LOG_LEVELS.NONE);
logger.clearLogHistory(); // ログ履歴もクリア

export const metadata = {
  title: 'タイピング練習ゲーム',
  description: 'Next.jsで作成されたタイピング練習ゲーム',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        {/* レスポンシブ対応のためのビューポート設定 */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        {/* 重要な音声ファイルをプリロード */}
        <link
          rel="preload"
          href="/sounds/Hit04-1.mp3"
          as="audio"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/sounds/Hit05-1.mp3"
          as="audio"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/sounds/buttonsound1.mp3"
          as="audio"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/sounds/resultsound.mp3"
          as="audio"
          crossOrigin="anonymous"
        />

        {/* ランタイムエラーを抑制するためのスクリプト */}
        <script
          dangerouslySetInnerHTML={{
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
          `,
          }}
        />

        {/* MCP初期化スクリプト - ログ出力を完全に無効化 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            // MCPオブジェクトの初期化
            window._mcp = window._mcp || {
              send: function(channel, data) {
                // ログ出力を抑制
                return true;
              },
              sendMessage: function(channel, data) {
                // ログ出力を抑制
                return true;
              },
              setContext: function(context) {
                // ログ出力を抑制
                this.context = context;
                return true;
              },
              context: { id: 'local-session-' + Date.now() },
              handlers: new Map(),
              eventListeners: new Map()
            };
            // 初期化メッセージも抑制
          `,
          }}
        />
      </head>
      <body
        className={fontClasses} // Geistの代わりにfonts.jsで定義したフォントクラスを使用
        suppressHydrationWarning
        style={{
          position: 'relative',
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          backgroundColor: '#111',
        }}
      >
        {/* MCPサーバー接続初期化 - childrenを渡す */}
        <MCPInitializer>{children}</MCPInitializer>
      </body>
    </html>
  );
}
