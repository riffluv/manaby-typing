import './globals.css';
import { fontClasses } from './fonts';  // fonts.jsからfontClassesをインポート

export const metadata = {
  title: 'タイピング練習ゲーム',
  description: 'Next.jsで作成されたタイピング練習ゲーム',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
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
        {/* ここではクライアントコンポーネントを直接インポートできないため、
            下層のページコンポーネントに背景を表示させる */}
        {children}
      </body>
    </html>
  );
}
