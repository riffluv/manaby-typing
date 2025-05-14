/**
 * デザイントークン定義ファイル
 * アプリケーション全体のデザイン変数を一元管理
 */

// カラーパレット
export const Colors = {
  background: '#0d1117',
  backgroundSecondary: '#161b22',
  primary: '#ff8c00',
  primaryLight: '#ff9a28',
  primaryDark: '#e67e00',
  secondary: '#4caf50',
  secondaryLight: '#80e27e',
  secondaryDark: '#087f23',
  textPrimary: '#ffffff',
  textSecondary: '#e1e1e1',
  textMuted: '#757575',
  error: '#ff6b6b',
  success: '#4caf50',
  warning: '#ffc107',
  info: '#4db8ff',
  border: 'rgba(255, 140, 0, 0.5)',
  shadowColor: 'rgba(0, 0, 0, 0.4)',
  accent: '#9c27b0', // アクセントカラーを追加
  // グラデーション定義を追加
  gradients: {
    primary: 'linear-gradient(135deg, #ff8c00 0%, #ff9a28 100%)',
    secondary: 'linear-gradient(135deg, #4caf50 0%, #80e27e 100%)',
    accent: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
    dark: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
  },
};

// タイポグラフィ
export const Typography = {
  // フォントファミリー
  fontFamilies: {
    // 基本フォント (日本語対応)
    base: "'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif",
    
    // タイトル用ドットフォント
    dot: "'Press Start 2P', cursive, monospace",
    
    // タイピング用等幅フォント (ローマ字表示の見やすさを重視)
    monospace: "'Source Code Pro', 'Fira Code', 'Cascadia Code', Consolas, monospace"
  },

  // フォントサイズ
  fontSizes: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    md: '1rem',      // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },

  // フォントウェイト
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // 行間
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },

  // タイピングゲーム専用のテキストスタイル
  typing: {
    problem: {
      fontSize: '1.5rem',
      lineHeight: 1.6,
      fontWeight: 500,
      letterSpacing: '0.02em',
    },
    input: {
      fontSize: '1.25rem',
      lineHeight: 1.5,
      fontWeight: 500,
      letterSpacing: '0.03em',
    }
  }
};

// スペーシング
export const Spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
};

// アニメーション
export const Animation = {
  duration: {
    fast: '0.15s',
    normal: '0.3s',
    slow: '0.5s',
  },
  easing: {
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // スプリングアニメーション用
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // バウンス効果用
  },
  keyframes: {
    // エラー表示用シェイクアニメーション
    errorShake: '@keyframes errorShake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-5px); } 40%, 80% { transform: translateX(5px); } }',
    // パルスアニメーション
    pulse: '@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }',
    // バウンスアニメーション
    bounce: '@keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-20px); } 60% { transform: translateY(-10px); } }',
    // フェードインアニメーション
    fadeIn: '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }',
    // スライドインアニメーション
    slideInUp: '@keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }',
  },
};

// ブレイクポイント
export const Breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
};

// エフェクト (シャドウ、ボーダー等)
export const Effects = {
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.2)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
  },
  border: {
    thin: '1px solid',
    medium: '2px solid',
    thick: '3px solid',
    radius: {
      sm: '4px',
      md: '8px',
      lg: '16px',
      full: '9999px',
    },
  },
};

// スタイルマージユーティリティ
export const StyleHelpers = {
  /**
   * 2つのスタイルオブジェクトを深くマージする
   * @param {Object} base - ベースとなるスタイルオブジェクト
   * @param {Object} override - 上書きするスタイルオブジェクト
   * @returns {Object} マージされた新しいスタイルオブジェクト
   */
  mergeStyles: (base, override) => {
    if (!override) return base;
    return { ...base, ...override };
  },

  /**
   * レスポンシブスタイルを生成する
   * @param {Object} styles - 基本スタイル
   * @param {Object} breakpoints - ブレイクポイント別のスタイル
   * @returns {Object} レスポンシブ対応スタイル
   */
  responsive: (styles, breakpoints = {}) => {
    const result = { ...styles };
    
    Object.keys(breakpoints).forEach(bp => {
      if (Breakpoints[bp]) {
        result[`@media (min-width: ${Breakpoints[bp]})`] = breakpoints[bp];
      }
    });
    
    return result;
  },
  
  /**
   * 複数のスタイル変数から統合されたスタイルを生成する
   * @param  {...Object} styles - 統合するスタイルオブジェクトの可変長引数
   * @returns {Object} 統合されたスタイルオブジェクト
   */
  combineStyles: (...styles) => {
    return styles.reduce((acc, style) => {
      if (!style) return acc;
      return { ...acc, ...style };
    }, {});
  }
};

// すべてのトークンをエクスポート
export default {
  Colors,
  Typography,
  Spacing,
  Animation,
  Breakpoints,
  Effects,
  StyleHelpers,
};