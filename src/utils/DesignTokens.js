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
  accent: 'var(--accent-color)',
  
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
  
  // テーマカラー
  theme: {
    dark: {
      background: '#1a1a1a',
      foreground: '#ffffff',
      primary: '#ff9800',
      secondary: '#3498db',
      accent: '#9c27b0',
    },
    light: {
      background: '#f5f5f5',
      foreground: '#333333',
      primary: '#ff9800',
      secondary: '#2980b9',
      accent: '#8e44ad',
    },
    gaming: {
      background: '#0f0f0f',
      foreground: '#ffffff',
      primary: '#ff3e3e',
      secondary: '#4e44ff',
      accent: '#00ff95',
    },
    retro: {
      background: '#000000',
      foreground: '#33ff33',
      primary: '#ff9900',
      secondary: '#ff00ff',
      accent: '#00ffff',
    },
    pastel: {
      background: '#f9f7f7',
      foreground: '#444444',
      primary: '#ffd966',
      secondary: '#a7d7c5',
      accent: '#f4a4a4',
    },
  },
  
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
  
  // グラデーション
  gradients: {
    primary: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
    secondary: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    accent: 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)',
    success: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
    warning: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
    error: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
    rainbow: 'linear-gradient(90deg, #ff0000, #ff9a00, #d0de21, #4fdc4a, #3fdad8, #2fc9e2, #1c7fee, #5f15f2, #ba0cf8, #fb07d9)',
    goldToSilver: 'linear-gradient(to right, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
  },
  
  // 透明度
  opacity: {
    0: '0',
    5: '0.05',
    10: '0.1',
    20: '0.2',
    25: '0.25',
    30: '0.3',
    40: '0.4',
    50: '0.5',
    60: '0.6',
    70: '0.7',
    75: '0.75',
    80: '0.8',
    90: '0.9',
    95: '0.95',
    100: '1',
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
  xxxl: '4rem',
  
  // コンポーネント間のギャップ
  componentGap: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  },
  
  // パディング
  padding: {
    card: '1.5rem 2rem',
    button: {
      small: '0.25rem 0.75rem',
      medium: '0.5rem 1.5rem',
      large: '0.75rem 2rem',
    },
    container: {
      xs: '1rem',
      sm: '1.5rem',
      md: '2rem',
      lg: '3rem',
    },
    section: '2rem',
  },
  
  // マージン
  margin: {
    section: '2rem 0',
    paragraph: '1rem 0',
    heading: '1.5rem 0 1rem',
    between: {
      xs: '0.5rem',
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
    },
  },
};

// レイアウトとサイズに関するトークン
export const Layout = {
  // 最大幅
  maxWidth: {
    content: '800px',
    container: '1200px',
    text: '65ch', // 読みやすい行の長さ
    modal: {
      small: '400px',
      medium: '600px',
      large: '800px',
    },
  },
  
  // 高さ
  height: {
    header: '60px',
    footer: '40px',
    gameContainer: '600px',
    button: {
      small: '36px',
      medium: '44px',
      large: '52px',
    },
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
    xl: '24px',
    pill: '50px',
    round: '9999px',
  },
  
  // ボーダー
  border: {
    thin: '1px solid',
    medium: '2px solid',
    thick: '4px solid',
    dashed: '2px dashed',
    dotted: '2px dotted',
  },
  
  // 影
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
    md: '0 4px 8px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.1)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.15)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
    glow: '0 0 8px',
    neon: '0 0 10px var(--primary-color), 0 0 20px var(--primary-color), 0 0 30px var(--primary-color)',
    text: '1px 1px 2px rgba(0, 0, 0, 0.3)',
    textGlow: '0 0 5px var(--primary-color)',
  },
  
  // アスペクト比
  aspectRatio: {
    square: '1/1',
    video: '16/9',
    cinema: '21/9',
    portrait: '3/4',
  },
  
  // グリッドレイアウト
  grid: {
    columns: {
      1: 'repeat(1, minmax(0, 1fr))',
      2: 'repeat(2, minmax(0, 1fr))',
      3: 'repeat(3, minmax(0, 1fr))',
      4: 'repeat(4, minmax(0, 1fr))',
      5: 'repeat(5, minmax(0, 1fr))',
      6: 'repeat(6, minmax(0, 1fr))',
      12: 'repeat(12, minmax(0, 1fr))',
    },
    gap: {
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    },
  },
  
  // フレックスボックス
  flex: {
    gap: {
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    },
  },
  
  // 位置
  position: {
    absoluteCenter: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    },
    absoluteFill: {
      position: 'absolute',
      top: '0',
      right: '0',
      bottom: '0',
      left: '0',
    },
  },
};

// タイポグラフィに関するトークン
export const Typography = {
  // フォントファミリー
  fontFamily: {
    normal: 'var(--font-normal)',
    dot: 'var(--font-dot)',
    heading: 'var(--font-heading)',
    code: 'var(--font-code)',
    mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
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
    '6xl': '2.5rem',
    '7xl': '3rem',
    '8xl': '3.5rem',
    '9xl': '4rem',
    problemText: 'var(--problem-text-size)',
    typingText: 'var(--typing-text-size)',
  },
  
  // 行の高さ
  lineHeight: {
    none: '1',
    tight: '1.2',
    normal: '1.5',
    loose: '1.8',
    problemText: 'var(--problem-text-line-height)',
    typingText: 'var(--typing-text-line-height)',
  },
  
  // フォントの太さ
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  
  // 文字間隔
  letterSpacing: {
    tightest: '-0.1em',
    tight: '-0.05em',
    normal: '0',
    wide: '0.05em',
    extraWide: '0.1em',
    widest: '0.2em',
  },
  
  // テキスト変形
  textTransform: {
    uppercase: 'uppercase',
    lowercase: 'lowercase',
    capitalize: 'capitalize',
    none: 'none',
  },
  
  // テキスト装飾
  textDecoration: {
    none: 'none',
    underline: 'underline',
    lineThrough: 'line-through',
    overline: 'overline',
  },
  
  // テキストスタイル
  textStyle: {
    heading1: {
      fontSize: 'var(--font-size-6xl)',
      fontWeight: '700',
      lineHeight: '1.2',
      marginBottom: '1rem',
    },
    heading2: {
      fontSize: 'var(--font-size-4xl)',
      fontWeight: '700',
      lineHeight: '1.2',
      marginBottom: '0.75rem',
    },
    heading3: {
      fontSize: 'var(--font-size-2xl)',
      fontWeight: '600',
      lineHeight: '1.3',
      marginBottom: '0.5rem',
    },
    paragraph: {
      fontSize: 'var(--font-size-md)',
      lineHeight: '1.5',
      marginBottom: '1rem',
    },
    label: {
      fontSize: 'var(--font-size-sm)',
      fontWeight: '500',
      marginBottom: '0.25rem',
    },
    caption: {
      fontSize: 'var(--font-size-xs)',
      color: 'var(--color-text-secondary)',
    },
  },
};

// アニメーションと遷移に関するトークン
export const Animation = {
  // 時間
  duration: {
    instant: '0s',
    ultraFast: '0.05s',
    extraFast: '0.1s',
    fast: '0.15s',
    normal: '0.3s',
    slow: '0.5s',
    slower: '0.7s',
    verySlow: '1s',
    extraSlow: '1.5s',
    ultraSlow: '2s',
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
    snappy: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  
  // 遅延
  delay: {
    none: '0s',
    short: '0.1s',
    medium: '0.3s',
    long: '0.5s',
  },
  
  // キーフレーム名
  keyframes: {
    errorShake: 'errorShake',
    blink: 'blink',
    cursorBlink: 'cursorBlink',
    fadeIn: 'fadeIn',
    fadeInUp: 'fadeInUp',
    fadeInDown: 'fadeInDown',
    fadeInLeft: 'fadeInLeft',
    fadeInRight: 'fadeInRight',
    fadeOut: 'fadeOut',
    fadeOutUp: 'fadeOutUp',
    fadeOutDown: 'fadeOutDown',
    fadeOutLeft: 'fadeOutLeft',
    fadeOutRight: 'fadeOutRight',
    rotate: 'rotate',
    pulse: 'pulse',
    bounce: 'bounce',
    floating: 'floating',
    scaleIn: 'scaleIn',
    scaleOut: 'scaleOut',
  },
};

// アニメーションプリセットを別途定義
Animation.animations = {
  fadeIn: `fadeIn ${Animation.duration.normal} ${Animation.easing.easeInOut}`,
  fadeInUp: `fadeInUp ${Animation.duration.normal} ${Animation.easing.easeOut}`,
  shake: `errorShake ${Animation.duration.fast} ${Animation.easing.linear}`,
  blink: `blink ${Animation.duration.slow} ${Animation.easing.linear} infinite`,
  cursorBlink: `cursorBlink 1s step-end infinite`,
  pulse: `pulse 2s ${Animation.easing.easeInOut} infinite`,
  bounce: `bounce 1s ${Animation.easing.bounce} infinite`,
  floating: `floating 3s ${Animation.easing.easeInOut} infinite`,
  rotate: `rotate 2s ${Animation.easing.linear} infinite`,
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
  overlay: 3000,
  popover: 4000,
  notifcation: 5000,
  adminPanel: 9000,
  devTools: 10000,
};

// ゲーム固有のデザイントークン
export const Game = {
  // リザルト画面のスコア表示
  resultScreen: {
    scoreDisplay: {
      fontSize: Typography.fontSize['5xl'],
      fontWeight: Typography.fontWeight.bold,
      color: Colors.primary,
      textShadow: Layout.shadows.textGlow,
      animation: `${Animation.keyframes.fadeInUp} ${Animation.duration.slow} ${Animation.easing.easeOut}`,
    },
    rankDisplay: {
      fontSize: Typography.fontSize['7xl'],
      fontWeight: Typography.fontWeight.black,
      textTransform: Typography.textTransform.uppercase,
      animation: `${Animation.keyframes.scaleIn} ${Animation.duration.slow} ${Animation.easing.bounce}`,
    },
    statItem: {
      fontSize: Typography.fontSize.lg,
      margin: `${Spacing.md} 0`,
      padding: Spacing.sm,
      borderRadius: Layout.borderRadius.md,
      background: 'rgba(0, 0, 0, 0.2)',
    },
  },
  
  // ゲーム画面のスタイル
  gameScreen: {
    container: {
      padding: Spacing.padding.container.md,
      borderRadius: Layout.borderRadius.lg,
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(10px)',
      boxShadow: Layout.shadows.lg,
    },
    problemDisplay: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.medium,
      textAlign: 'center',
      margin: `${Spacing.lg} 0`,
      padding: Spacing.md,
      borderRadius: Layout.borderRadius.md,
      background: 'rgba(255, 255, 255, 0.1)',
    },
    typingDisplay: {
      fontSize: Typography.fontSize.xl,
      fontFamily: Typography.fontFamily.mono,
      letterSpacing: Typography.letterSpacing.wide,
      lineHeight: Typography.lineHeight.loose,
      padding: `${Spacing.md} ${Spacing.lg}`,
      borderRadius: Layout.borderRadius.md,
      background: 'rgba(0, 0, 0, 0.3)',
      border: `${Layout.border.thin} rgba(255, 255, 255, 0.1)`,
    },
    stats: {
      fontSize: Typography.fontSize.md,
      display: 'grid',
      gridTemplateColumns: Layout.grid.columns[3],
      gap: Layout.grid.gap.md,
      margin: `${Spacing.lg} 0`,
    },
  },
  
  // メインメニュー
  mainMenu: {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: Spacing.componentGap.lg,
      padding: Spacing.padding.section,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
    },
    title: {
      fontSize: Typography.fontSize['7xl'],
      fontWeight: Typography.fontWeight.bold,
      textAlign: 'center',
      marginBottom: Spacing.xl,
      color: Colors.primary,
      textShadow: Layout.shadows.neon,
      animation: `${Animation.keyframes.pulse} 3s ${Animation.easing.easeInOut} infinite`,
    },
    buttonContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: Spacing.md,
      width: '100%',
      maxWidth: Layout.maxWidth.content,
    },
  },
};

// スタイルヘルパー関数
export const StyleHelpers = {
  /**
   * 中央揃えのフレックスレイアウトを作成する
   * @param {string} direction - フレックスの方向 ('row'または'column')
   * @returns {Object} スタイルオブジェクト
   */
  flexCenter: (direction = 'row') => ({
    display: 'flex',
    flexDirection: direction,
    alignItems: 'center',
    justifyContent: 'center',
  }),
  
  /**
   * 複数のスタイルオブジェクトをマージする
   * @param {...Object} styles - 任意の数のスタイルオブジェクト
   * @returns {Object} マージされたスタイルオブジェクト
   */
  mergeStyles: (...styles) => {
    return styles.reduce((merged, style) => {
      return { ...merged, ...(style || {}) };
    }, {});
  },
  
  /**
   * 条件付きでスタイルをマージする
   * @param {Object} baseStyles - ベーススタイル
   * @param {Object} conditionalStyles - 条件と対応するスタイルのオブジェクト
   * @returns {Object} マージされたスタイルオブジェクト
   */
  conditionalStyles: (baseStyles, conditionalStyles) => {
    return Object.entries(conditionalStyles).reduce(
      (result, [condition, styles]) => {
        if (Boolean(condition)) {
          return { ...result, ...styles };
        }
        return result;
      },
      { ...baseStyles }
    );
  },
  
  /**
   * レスポンシブスタイルの作成
   * @param {Object} baseStyles - 基本スタイル
   * @param {Object} breakpointStyles - ブレイクポイントごとのスタイル
   * @returns {Object} CSSメディアクエリを含むスタイルオブジェクト
   */
  responsive: (baseStyles, breakpointStyles) => {
    const mediaQueries = {};
    
    if (breakpointStyles) {
      Object.entries(breakpointStyles).forEach(([breakpoint, styles]) => {
        const minWidth = Layout.breakpoints[breakpoint];
        if (minWidth) {
          mediaQueries[`@media (min-width: ${minWidth})`] = styles;
        }
      });
    }
    
    return {
      ...baseStyles,
      ...mediaQueries,
    };
  },
  
  /**
   * ガラスモルフィズム効果を適用する
   * @param {Object} options - オプション
   * @param {number} options.opacity - 背景の不透明度 (0-1)
   * @param {number} options.blur - ぼかし量 (px)
   * @param {string} options.color - 背景色
   * @returns {Object} スタイルオブジェクト
   */
  glassMorphism: ({ opacity = 0.15, blur = 10, color = 'rgba(255, 255, 255, 0.2)' } = {}) => ({
    backgroundColor: color,
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`, // Safari用
    opacity: opacity,
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  }),
  
  /**
   * テキストを表示する行数を制限する
   * @param {number} lines - 表示する最大行数
   * @returns {Object} スタイルオブジェクト
   */
  lineClamp: (lines) => ({
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
};

export default {
  Colors,
  Spacing,
  Layout,
  Typography,
  Animation,
  zIndex,
  Game,
  StyleHelpers,
};