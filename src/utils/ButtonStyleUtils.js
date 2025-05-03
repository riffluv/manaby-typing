/**
 * ボタン関連のスタイル定義を集約したユーティリティ
 * 
 * プロジェクト全体で使用されるボタンのスタイルを一元管理し、
 * 一貫性のあるUI設計を実現します。デザイントークンと連携して使用します。
 */

import { Colors, Typography, Spacing, Layout, Animation } from './DesignTokens';

// ボタンの基本スタイル
export const ButtonBaseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: Typography.fontFamily.normal,
  fontWeight: Typography.fontWeight.medium,
  borderRadius: Layout.borderRadius.md,
  cursor: 'pointer',
  transition: `all ${Animation.duration.fast} ${Animation.easing.easeOut}`,
  border: 'none',
  outline: 'none',
  userSelect: 'none',
  textAlign: 'center',
  lineHeight: Typography.lineHeight.normal,
  position: 'relative',
  overflow: 'hidden',
};

// ボタンバリエーション別のスタイル
export const ButtonVariants = {
  // デフォルト（プライマリ）ボタン
  primary: {
    backgroundColor: Colors.primary,
    color: Colors.foreground,
    boxShadow: `0 4px 6px rgba(0, 0, 0, 0.1), inset 0 1px rgba(255, 255, 255, 0.1)`,
    '&:hover': {
      backgroundColor: `color-mix(in srgb, ${Colors.primary} 90%, white)`,
      transform: 'translateY(-2px)',
    },
    '&:active': {
      transform: 'translateY(1px)',
      boxShadow: '0 2px 3px rgba(0, 0, 0, 0.1)',
    },
  },
  
  // セカンダリボタン
  secondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: Colors.secondary,
    border: `1px solid ${Colors.secondary}`,
    boxShadow: 'none',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      transform: 'translateY(-2px)',
    },
    '&:active': {
      transform: 'translateY(1px)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
  },
  
  // アウトラインボタン
  outline: {
    backgroundColor: 'transparent',
    color: Colors.foreground,
    border: `1px solid rgba(255, 255, 255, 0.3)`,
    boxShadow: 'none',
    '&:hover': {
      border: `1px solid ${Colors.foreground}`,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
  
  // 危険アクションボタン
  danger: {
    backgroundColor: Colors.error,
    color: '#fff',
    boxShadow: '0 4px 6px rgba(255, 107, 107, 0.2)',
    '&:hover': {
      backgroundColor: `color-mix(in srgb, ${Colors.error} 90%, white)`,
    },
  },
  
  // 成功ボタン
  success: {
    backgroundColor: Colors.success,
    color: '#fff',
    boxShadow: '0 4px 6px rgba(76, 175, 80, 0.2)',
    '&:hover': {
      backgroundColor: `color-mix(in srgb, ${Colors.success} 90%, white)`,
    },
  },
  
  // ゲームメニューボタン
  menu: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: Colors.primary,
    border: `1px solid ${Colors.primary}`,
    padding: '0.75rem 1.5rem',
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: Typography.letterSpacing.wide,
    borderRadius: Layout.borderRadius.lg,
    backdropFilter: 'blur(5px)',
    '&:hover': {
      backgroundColor: 'rgba(255, 140, 0, 0.15)',
      transform: 'translateY(-3px)',
      boxShadow: '0 5px 15px rgba(255, 140, 0, 0.2)',
    },
    '&:active': {
      transform: 'translateY(1px)',
    },
  },
  
  // トグルボタン
  toggle: {
    position: 'relative',
    padding: '0.25rem 2rem',
    minWidth: '100px',
    '&.toggle--on': {
      backgroundColor: Colors.success,
      color: '#fff',
    },
    '&.toggle--off': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: Colors.foreground,
    },
  },
};

// ボタンサイズ別のスタイル
export const ButtonSizes = {
  small: {
    padding: Spacing.padding.button.small,
    fontSize: Typography.fontSize.sm,
    height: '30px',
    minWidth: '80px',
  },
  medium: {
    padding: Spacing.padding.button.medium,
    fontSize: Typography.fontSize.md,
    height: '40px',
    minWidth: '120px',
  },
  large: {
    padding: Spacing.padding.button.large,
    fontSize: Typography.fontSize.lg,
    height: '50px',
    minWidth: '160px',
  },
};

// 特殊ボタンスタイル
export const SpecialButtonStyles = {
  // 丸型ボタン
  round: {
    borderRadius: Layout.borderRadius.round,
    aspectRatio: '1 / 1',
    minWidth: 'unset',
    padding: 0,
  },
  
  // 難易度選択ボタン
  difficulty: {
    minWidth: '150px',
    padding: '1rem 1.5rem',
    margin: '0.5rem',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    fontWeight: Typography.fontWeight.bold,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: `all ${Animation.duration.normal} ${Animation.easing.spring}`,
    '&:hover': {
      transform: 'translateY(-3px) scale(1.05)',
      boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 140, 0, 0.3)',
    },
    '&.active': {
      backgroundColor: 'rgba(255, 140, 0, 0.2)',
      border: `1px solid ${Colors.primary}`,
      color: Colors.primary,
      boxShadow: `0 0 15px rgba(255, 140, 0, 0.3)`,
    },
  },
  
  // アイコン付きボタン
  withIcon: {
    gap: Spacing.sm,
  },
  
  // アクティブ状態
  active: {
    backgroundColor: `color-mix(in srgb, ${Colors.primary} 20%, black)`,
    color: Colors.primary,
    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
  },
  
  // 無効状態
  disabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    pointerEvents: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.4)',
    boxShadow: 'none',
  },
};

// アニメーション効果
export const ButtonAnimations = {
  hover: {
    transform: 'translateY(-2px)',
    boxShadow: `0 7px 14px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.1)`,
  },
  tap: {
    transform: 'translateY(1px)',
    boxShadow: `0 3px 8px rgba(0, 0, 0, 0.1)`,
  },
  // フレーマーモーション用設定
  framerMotion: {
    whileHover: {
      scale: 1.05,
      y: -2,
    },
    whileTap: {
      scale: 0.95,
      y: 1,
    },
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },
};

// ボタンのCSSクラスを動的に生成するヘルパー関数
export function getButtonClassName({
  variant = 'default',
  size = 'medium',
  round = false,
  active = false,
  withIcon = false,
  disabled = false,
  className = '',
}) {
  // 常に使用する基本クラス
  let classes = ['button'];
  
  // バリアント
  if (variant !== 'default') {
    classes.push(`button--${variant}`);
  }
  
  // サイズ
  if (size !== 'medium') {
    classes.push(`button--${size}`);
  }
  
  // 丸みを帯びたスタイル
  if (round) {
    classes.push('button--round');
  }
  
  // アイコン付き
  if (withIcon) {
    classes.push('button--with-icon');
  }
  
  // アクティブ状態
  if (active) {
    classes.push('button--active');
  }
  
  // 無効状態
  if (disabled) {
    classes.push('button--disabled');
  }
  
  // 追加のクラス名
  if (className) {
    classes.push(className);
  }
  
  return classes.join(' ');
}