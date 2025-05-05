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
        {/* MCPサーバー接続初期化 */}
        <MCPInitializer />
        
        {/* ここではクライアントコンポーネントを直接インポートできないため、
            下層のページコンポーネントに背景を表示させる */}
        {children}
      </body>
    </html>
  );
}
