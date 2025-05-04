import './globals.css';
import { fontClasses } from './fonts';

export const metadata = {
  title: 'タイピングゲーム',
  description: '高パフォーマンスなタイピングゲーム',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={fontClasses}>
      <body>{children}</body>
    </html>
  );
}
