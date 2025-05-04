/**
 * フォント設定ファイル
 * Next.jsの組み込みフォントシステムを使用して最適化
 */
import { Noto_Sans_JP, Press_Start_2P, Source_Code_Pro, Fira_Code } from 'next/font/google';

// 日本語対応の基本フォント
export const notoSansJP = Noto_Sans_JP({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-jp',
  adjustFontFallback: true, // 日本語用にフォールバック調整
  preload: true,
});

// ドット絵風のタイトル用フォント
export const pressStart2P = Press_Start_2P({
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-press-start-2p',
  preload: true,
});

// タイピング用等幅フォント（主要）
export const sourceCodePro = Source_Code_Pro({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-code-pro',
  preload: true,
});

// 代替の等幅フォント（一部の特殊記号や表示の補完用）
export const firaCode = Fira_Code({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fira-code',
  preload: false, // 必要に応じて読み込み
});

// フォントの変数名をまとめたオブジェクト
export const fontVariables = {
  notoSansJP: notoSansJP.variable,
  pressStart2P: pressStart2P.variable,
  sourceCodePro: sourceCodePro.variable,
  firaCode: firaCode.variable,
};

// CSS変数として使用するためのクラス名
export const fontClasses = [
  notoSansJP.variable,
  pressStart2P.variable, 
  sourceCodePro.variable,
  firaCode.variable
].join(' ');