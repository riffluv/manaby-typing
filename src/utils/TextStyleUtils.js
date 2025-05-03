/**
 * タイピングゲームのテキスト関連スタイルを一元管理するユーティリティ
 * 
 * このファイルはタイピングゲーム内のテキスト表示に関する
 * 色、サイズ、フォント、スタイルなどの定義を集約しています。
 * 複数のコンポーネントで一貫したテキスト表示を実現するために使用します。
 * 
 * 注: フォント関連の基本定義はglobals.cssに移動し、ここではglobals.cssの変数を参照します
 */

import { Colors, Typography, Animation } from './DesignTokens';

// テキストカラー関連の定数
export const TextColors = {
  // 基本色
  DEFAULT: 'var(--foreground)',
  PRIMARY: 'var(--primary-color)',
  SECONDARY: 'var(--secondary-color)',
  
  // タイピング関連
  PROBLEM_TEXT: 'var(--problem-text-color)',
  TYPED_TEXT: 'var(--typed-text-color)',
  CURRENT_INPUT: 'var(--current-input-color)',
  NEXT_CHAR: 'var(--next-char-color)',
  NOT_TYPED: 'var(--not-typed-color)',
  ERROR_TEXT: 'var(--error-color)',

  // ランク別の色（DesignTokensから参照）
  RANK_GOD: Colors.ranks.god,
  RANK_DIVINE: Colors.ranks.divine,
  RANK_LEGEND: Colors.ranks.legend,
  RANK_SSS_PLUS: Colors.ranks.sssPlus,
  RANK_SSS: Colors.ranks.sss,
  RANK_SS_PLUS: Colors.ranks.ssPlus,
  RANK_SS: Colors.ranks.ss,
  RANK_S_PLUS: Colors.ranks.sPlus,
  RANK_S: Colors.ranks.s,
  RANK_A_PLUS: Colors.ranks.aPlus,
  RANK_A: Colors.ranks.a,
  RANK_B_PLUS: Colors.ranks.bPlus,
  RANK_B: Colors.ranks.b,
  RANK_C_PLUS: Colors.ranks.cPlus,
  RANK_C: Colors.ranks.c,
  RANK_D_PLUS: Colors.ranks.dPlus,
  RANK_D: Colors.ranks.d,
  RANK_E_PLUS: Colors.ranks.ePlus,
  RANK_E: Colors.ranks.e,
  RANK_ROOKIE: Colors.ranks.rookie,
  RANK_BEGINNER: Colors.ranks.beginner,
};

// フォントサイズ関連の定数（CSSカスタムプロパティを参照）
export const TextSizes = {
  PROBLEM_TEXT: 'var(--problem-text-size)',
  TYPING_TEXT: 'var(--typing-text-size)',
  HEADING_XL: 'var(--font-size-4xl)',
  HEADING_LG: 'var(--font-size-3xl)',
  HEADING_MD: 'var(--font-size-2xl)',
  HEADING_SM: 'var(--font-size-xl)',
  BODY_LG: 'var(--font-size-lg)',
  BODY_MD: 'var(--font-size-md)',
  BODY_SM: 'var(--font-size-sm)',
  CAPTION: 'var(--font-size-xs)',
};

// フォントスタイル関連の定数
// 注: これらはJSX内でインラインスタイルとして使用される場合のために残します
// 新しいコンポーネントでは可能な限りglobals.cssのクラスを使用することを推奨
export const TextStyles = {
  // テキストスタイルのレガシーサポート - 互換性のために残す
  // 新しいコードでは .typing-problem クラスを使用してください
  problemText: {
    color: TextColors.PROBLEM_TEXT,
    textShadow: '0px 2px 10px rgba(0, 0, 0, 0.5)',
  },
  
  // タイピング入力表示用 - 互換性のために残す
  // 新しいコードでは .typing-text クラスを使用してください
  typingText: {
    textShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
  },
  
  // タイピング入力の状態別スタイル - インラインスタイル用
  // 新しいコードでは .typing-completed クラスなどを使用してください
  typed: {
    color: TextColors.TYPED_TEXT,
    textShadow: '0px 0px 8px rgba(106, 255, 139, 0.4)',
  },
  
  current: {
    color: TextColors.CURRENT_INPUT,
    textShadow: '0px 0px 8px rgba(77, 184, 255, 0.4)',
  },
  
  nextChar: {
    color: TextColors.NEXT_CHAR,
    position: 'relative',
    textShadow: '0px 0px 8px rgba(255, 154, 40, 0.4)',
  },
  
  notTyped: {
    color: TextColors.NOT_TYPED,
  },
  
  error: {
    color: TextColors.ERROR_TEXT,
    textShadow: '0px 0px 8px rgba(255, 107, 107, 0.4)',
  },
};

// アニメーション関連の定数
export const TextAnimations = {
  errorShake: `${Animation.keyframes.errorShake} 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both`,
  cursor: `${Animation.keyframes.cursorBlink} 1s infinite`,
  blink: `${Animation.keyframes.blink} 1.2s infinite`,
};

// ランク別の色を取得する関数
export function getRankColor(rank) {
  switch (rank?.toUpperCase()) {
    case 'GOD': return Colors.ranks.god;
    case 'DIVINE': return Colors.ranks.divine;
    case 'LEGEND': return Colors.ranks.legend;
    case 'SSS+': return Colors.ranks.sssPlus;
    case 'SSS': return Colors.ranks.sss;
    case 'SS+': return Colors.ranks.ssPlus;
    case 'SS': return Colors.ranks.ss;
    case 'S+': return Colors.ranks.sPlus;
    case 'S': return Colors.ranks.s;
    case 'A+': return Colors.ranks.aPlus;
    case 'A': return Colors.ranks.a;
    case 'B+': return Colors.ranks.bPlus;
    case 'B': return Colors.ranks.b;
    case 'C+': return Colors.ranks.cPlus;
    case 'C': return Colors.ranks.c;
    case 'D+': return Colors.ranks.dPlus;
    case 'D': return Colors.ranks.d;
    case 'E+': return Colors.ranks.ePlus;
    case 'E': return Colors.ranks.e;
    case 'ROOKIE': return Colors.ranks.rookie;
    case 'BEGINNER': return Colors.ranks.beginner;
    default: return '#ffffff';
  }
}