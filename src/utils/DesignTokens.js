/**
 * デザイントークン定義ファイル
 * 
 * タイピングゲーム全体で使用されるデザイン要素（色、サイズ、間隔など）を
 * 一元管理するためのデザイントークンを定義します。
 * CSSカスタムプロパティ(変数)と連携して使用します。
 */

// 色に関するトークン
export const Colors = {
  // 基本カラー
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  primary: 'var(--primary-color)',
  secondary: 'var(--secondary-color)',
  
  // ステータスカラー
  success: '#4caf50',
  warning: '#ff9a28',
  error: '#ff6b6b',
  info: '#4db8ff',
  
  // タイピングテキスト関連
  typedText: 'var(--typed-text-color)',
  currentInput: 'var(--typed-text-color)', // 確定済み文字と同じ色
  nextChar: 'var(--next-char-color)',
  notTyped: 'var(--not-typed-color)',
  problemText: 'var(--problem-text-color)',
  
  // その他の色
  overlay: 'rgba(0, 0, 0, 0.5)',
  cardBackground: 'rgba(0, 0, 0, 0.25)',
  cardBorder: 'rgba(255, 140, 0, 0.15)',
  
  // ランク色（KPMランク別）
  ranks: {
    god: '#ff00ff',
    divine: '#ff00cc',
    legend: '#9900ff',
    sssPlus: '#6600ff',
    sss: '#0033ff',
    ssPlus: '#0099ff',
    ss: '#00ccff',
    sPlus: '#00ffcc',
    s: '#00ff66',
    aPlus: '#33ff00',
    a: '#99ff00',
    bPlus: '#ccff00',
    b: '#ffff00',
    cPlus: '#ffcc00',
    c: '#ff9900',
    dPlus: '#ff6600',
    d: '#ff3300',
    ePlus: '#ff0000',
    e: '#cc0000',
    rookie: '#9370DB',
    beginner: '#6495ED',
  },
};

// スペーシング（余白・間隔）に関するトークン
export const Spacing = {
  // 基本間隔（rem単位）
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
  
  // コンポーネント間のギャップ
  componentGap: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
  },
  
  // パディング
  padding: {
    card: '1.5rem 2rem',
    button: {
      small: '0.25rem 0.75rem',
      medium: '0.5rem 1.5rem',
      large: '0.75rem 2rem',
    },
  },
  
  // マージン
  margin: {
    section: '2rem 0',
    paragraph: '1rem 0',
    heading: '1.5rem 0 1rem',
  },
};

// レイアウトとサイズに関するトークン
export const Layout = {
  // 最大幅
  maxWidth: {
    content: '800px',
    container: '1200px',
    text: '65ch', // 読みやすい行の長さ
  },
  
  // 高さ
  height: {
    header: '60px',
    footer: '40px',
    gameContainer: '600px',
  },
  
  // ブレイクポイント
  breakpoints: {
    xs: '320px',
    sm: '480px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
  },
  
  // 境界半径
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    round: '9999px',
  },
  
  // ボーダー
  border: {
    thin: '1px solid',
    medium: '2px solid',
    thick: '4px solid',
  },
  
  // 影
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
    md: '0 4px 8px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.1)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
    glow: '0 0 8px',
  },
};

// タイポグラフィに関するトークン
export const Typography = {
  // フォントファミリー
  fontFamily: {
    normal: 'var(--font-normal)',
    dot: 'var(--font-dot)',
  },
  
  // フォントサイズ
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.75rem',
    '4xl': '2rem',
    '5xl': '2.25rem',
    problemText: 'var(--problem-text-size)',
    typingText: 'var(--typing-text-size)',
  },
  
  // 行の高さ
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    loose: 1.8,
    problemText: 'var(--problem-text-line-height)',
    typingText: 'var(--typing-text-line-height)',
  },
  
  // フォントの太さ
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // 文字間隔
  letterSpacing: {
    tight: '-0.05em',
    normal: '0',
    wide: '0.05em',
    extraWide: '0.1em',
  },
};

// アニメーションと遷移に関するトークン
export const Animation = {
  // 時間
  duration: {
    fast: '0.15s',
    normal: '0.3s',
    slow: '0.5s',
    verySlow: '1s',
  },
  
  // イージング関数
  easing: {
    default: 'ease',
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    // cubic-bezier
    spring: 'cubic-bezier(0.155, 1.105, 0.295, 1.12)',
    bounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  
  // キーフレーム名
  keyframes: {
    errorShake: 'errorShake',
    blink: 'blink',
    cursorBlink: 'cursorBlink',
    fadeIn: 'fadeIn',
    fadeInUp: 'fadeInUp',
  },
};

// Zインデックス管理
export const zIndex = {
  background: -1,
  default: 0,
  dropdown: 10,
  sticky: 100,
  modal: 1000,
  tooltip: 1500,
  toast: 2000,
};