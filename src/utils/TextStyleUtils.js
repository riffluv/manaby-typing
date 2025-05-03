/**
 * タイピングゲームのテキスト関連スタイルを一元管理するユーティリティ
 * 
 * このファイルはタイピングゲーム内のテキスト表示に関する
 * 色、サイズ、フォント、スタイルなどの定義を集約しています。
 * 複数のコンポーネントで一貫したテキスト表示を実現するために使用します。
 */

// テキストカラー関連の定数
export const TextColors = {
  // 基本色
  DEFAULT: 'var(--foreground)',
  PRIMARY: 'var(--primary-color)',
  SECONDARY: 'var(--secondary-color)',
  
  // タイピング関連
  PROBLEM_TEXT: 'var(--problem-text-color)',
  TYPED_TEXT: 'var(--typed-text-color)',
  CURRENT_INPUT: 'var(--typed-text-color)', // 確定済み文字と同じ緑色
  NEXT_CHAR: 'var(--next-char-color)',
  NOT_TYPED: 'var(--not-typed-color)',
  ERROR_TEXT: 'var(--error-color)',

  // ランク別の色（KPM評価用）
  RANK_GOD: '#ff00ff',
  RANK_DIVINE: '#ff00cc',
  RANK_LEGEND: '#9900ff',
  RANK_SSS_PLUS: '#6600ff',
  RANK_SSS: '#0033ff',
  RANK_SS_PLUS: '#0099ff',
  RANK_SS: '#00ccff',
  RANK_S_PLUS: '#00ffcc',
  RANK_S: '#00ff66',
  RANK_A_PLUS: '#33ff00',
  RANK_A: '#99ff00',
  RANK_B_PLUS: '#ccff00',
  RANK_B: '#ffff00',
  RANK_C_PLUS: '#ffcc00',
  RANK_C: '#ff9900',
  RANK_D_PLUS: '#ff6600',
  RANK_D: '#ff3300',
  RANK_E_PLUS: '#ff0000',
  RANK_E: '#cc0000',
  RANK_ROOKIE: '#9370DB',
  RANK_BEGINNER: '#6495ED',
};

// フォントサイズ関連の定数
export const TextSizes = {
  PROBLEM_TEXT: 'var(--problem-text-size)',
  TYPING_TEXT: 'var(--typing-text-size)',
  HEADING_XL: '2.25rem',
  HEADING_LG: '2rem',
  HEADING_MD: '1.5rem',
  HEADING_SM: '1.25rem',
  BODY_LG: '1.125rem',
  BODY_MD: '1rem',
  BODY_SM: '0.875rem',
  CAPTION: '0.75rem',
};

// フォントスタイル関連の定数
export const TextStyles = {
  // 問題テキスト用（お題表示）
  problemText: {
    fontSize: TextSizes.PROBLEM_TEXT,
    fontWeight: '700',
    letterSpacing: '1px',
    fontFamily: 'var(--font-normal)',
    lineHeight: 'var(--problem-text-line-height)',
    color: TextColors.PROBLEM_TEXT,
    textShadow: '0px 2px 10px rgba(0, 0, 0, 0.5)',
  },
  
  // タイピング入力表示用
  typingText: {
    fontSize: TextSizes.TYPING_TEXT,
    fontWeight: '600',
    letterSpacing: '1.5px',
    fontFamily: 'var(--font-normal)',
    lineHeight: 'var(--typing-text-line-height)',
    textShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
  },
  
  // タイピング入力の状態別スタイル
  typed: {
    color: TextColors.TYPED_TEXT,
    fontWeight: '600',
    textShadow: '0px 0px 8px rgba(106, 255, 139, 0.4)',
  },
  
  current: {
    color: TextColors.CURRENT_INPUT,
    fontWeight: '600',
    textShadow: '0px 0px 8px rgba(106, 255, 139, 0.4)',
  },
  
  nextChar: {
    color: TextColors.NEXT_CHAR,
    fontWeight: '700',
    position: 'relative',
    textShadow: '0px 0px 8px rgba(255, 154, 40, 0.4)',
  },
  
  notTyped: {
    color: TextColors.NOT_TYPED,
    opacity: '0.8',
  },
  
  error: {
    color: TextColors.ERROR_TEXT,
    textShadow: '0px 0px 8px rgba(255, 107, 107, 0.4)',
  },
};

// アニメーション関連の定数
export const TextAnimations = {
  errorShake: 'errorShake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
  cursor: 'cursorBlink 1s infinite',
  blink: 'blink 1.2s infinite',
};

// ランク別の色を取得する関数
export function getRankColor(rank) {
  switch (rank?.toUpperCase()) {
    case 'GOD': return TextColors.RANK_GOD;
    case 'DIVINE': return TextColors.RANK_DIVINE;
    case 'LEGEND': return TextColors.RANK_LEGEND;
    case 'SSS+': return TextColors.RANK_SSS_PLUS;
    case 'SSS': return TextColors.RANK_SSS;
    case 'SS+': return TextColors.RANK_SS_PLUS;
    case 'SS': return TextColors.RANK_SS;
    case 'S+': return TextColors.RANK_S_PLUS;
    case 'S': return TextColors.RANK_S;
    case 'A+': return TextColors.RANK_A_PLUS;
    case 'A': return TextColors.RANK_A;
    case 'B+': return TextColors.RANK_B_PLUS;
    case 'B': return TextColors.RANK_B;
    case 'C+': return TextColors.RANK_C_PLUS;
    case 'C': return TextColors.RANK_C;
    case 'D+': return TextColors.RANK_D_PLUS;
    case 'D': return TextColors.RANK_D;
    case 'E+': return TextColors.RANK_E_PLUS;
    case 'E': return TextColors.RANK_E;
    case 'ROOKIE': return TextColors.RANK_ROOKIE;
    case 'BEGINNER': return TextColors.RANK_BEGINNER;
    default: return '#ffffff';
  }
}