/**
 * ボタン関連のスタイル定義を集約したユーティリティ
 * 
 * プロジェクト全体で使用されるボタンのスタイルを一元管理し、
 * 一貫性のあるUI設計を実現します。デザイントークンと連携して使用します。
 */

import { Colors, Typography, Spacing, Animation, Effects, StyleHelpers } from './DesignTokens';

// ボタンの基本スタイル
export const ButtonBaseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: Typography.fontFamilies.base,
  fontWeight: Typography.fontWeights.medium,
  borderRadius: Effects.border.radius.md,
  cursor: 'pointer',
  transition: `all ${Animation.duration.fast} ${Animation.easing.easeOut}`,
  border: 'none',
  outline: 'none',
  userSelect: 'none',
  textAlign: 'center',
  lineHeight: Typography.lineHeights.normal,
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
  
  // 強調ボタン（アクセントカラー使用）
  accent: {
    backgroundColor: Colors.accent,
    color: '#ffffff',
    boxShadow: `0 4px 6px rgba(0, 0, 0, 0.15), inset 0 1px rgba(255, 255, 255, 0.1)`,
    '&:hover': {
      backgroundColor: `color-mix(in srgb, ${Colors.accent} 90%, white)`,
      transform: 'translateY(-2px)',
      boxShadow: `0 6px 8px rgba(0, 0, 0, 0.2)`,
    },
    '&:active': {
      transform: 'translateY(1px)',
      boxShadow: '0 2px 3px rgba(0, 0, 0, 0.1)',
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
  
  // ゴーストボタン（より軽量なアウトライン）
  ghost: {
    backgroundColor: 'transparent',
    color: Colors.foreground,
    border: 'none',
    boxShadow: 'none',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.07)',
    },
    '&:active': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
  
  // リンクスタイルボタン
  link: {
    backgroundColor: 'transparent',
    color: Colors.secondary,
    padding: 0,
    border: 'none',
    textDecoration: 'underline',
    boxShadow: 'none',
    minWidth: 'auto',
    height: 'auto',
    '&:hover': {
      color: Colors.primary,
      transform: 'none',
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
  
  // 警告ボタン
  warning: {
    backgroundColor: Colors.warning,
    color: '#fff',
    boxShadow: '0 4px 6px rgba(255, 154, 40, 0.2)',
    '&:hover': {
      backgroundColor: `color-mix(in srgb, ${Colors.warning} 90%, white)`,
    },
  },
  
  // 情報ボタン
  info: {
    backgroundColor: Colors.info,
    color: '#fff',
    boxShadow: '0 4px 6px rgba(77, 184, 255, 0.2)',
    '&:hover': {
      backgroundColor: `color-mix(in srgb, ${Colors.info} 90%, white)`,
    },
  },
  
  // ガラスモルフィズム
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: Colors.foreground,
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
  },
  
  // グラデーション
  gradient: {
    background: Colors.gradients.primary,
    color: '#ffffff',
    border: 'none',
    '&:hover': {
      opacity: 0.9,
      transform: 'translateY(-2px)',
      boxShadow: `0 7px 14px rgba(0, 0, 0, 0.1)`,
    },
  },
  
  // ゲームメニューボタン
  menu: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: Colors.primary,
    border: `1px solid ${Colors.primary}`,
    padding: '0.75rem 1.5rem',
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: '2px',
    borderRadius: Effects.border.radius.lg,
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
  
  // ネオン
  neon: {
    backgroundColor: 'transparent',
    color: Colors.primary,
    border: `2px solid ${Colors.primary}`,
    boxShadow: `0 0 10px ${Colors.primary}`,
    textShadow: `0 0 5px ${Colors.primary}`,
    '&:hover': {
      textShadow: `0 0 10px ${Colors.primary}`,
      boxShadow: `0 0 15px ${Colors.primary}, 0 0 30px ${Colors.primary}`,
      backgroundColor: 'rgba(255, 140, 0, 0.1)',
    },
  },
};

// ボタンサイズ別のスタイル
export const ButtonSizes = {
  tiny: {
    padding: '0.15rem 0.5rem',
    fontSize: Typography.fontSizes.xs,
    height: '24px',
    minWidth: '60px',
  },
  small: {
    padding: '0.5rem 1rem',
    fontSize: Typography.fontSizes.sm,
    height: '32px',
    minWidth: '80px',
  },
  medium: {
    padding: '0.75rem 1.25rem',
    fontSize: Typography.fontSizes.md,
    height: '40px',
    minWidth: '120px',
  },
  large: {
    padding: '0.875rem 1.5rem',
    fontSize: Typography.fontSizes.lg,
    height: '48px',
    minWidth: '160px',
  },
  xlarge: {
    padding: '1rem 2.5rem',
    fontSize: Typography.fontSizes.xl,
    height: '60px',
    minWidth: '200px',
    fontWeight: Typography.fontWeights.bold,
  },
  fullWidth: {
    width: '100%',
    padding: '0.75rem 1.25rem',
    fontSize: Typography.fontSizes.md,
  },
};

// 特殊ボタンスタイル
export const SpecialButtonStyles = {
  // 丸型ボタン
  round: {
    borderRadius: '50%',
    aspectRatio: '1 / 1',
    minWidth: 'unset',
    padding: 0,
  },
  
  // カプセル型ボタン
  pill: {
    borderRadius: '999px',
  },
  
  // 正方形ボタン
  square: {
    aspectRatio: '1 / 1',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // 難易度選択ボタン
  difficulty: {
    minWidth: '150px',
    padding: '1rem 1.5rem',
    margin: '0.5rem',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    fontWeight: Typography.fontWeights.bold,
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
  
  // 3Dボタン
  threeDimensional: {
    borderBottom: '4px solid rgba(0, 0, 0, 0.2)',
    '&:active': {
      borderBottom: '2px solid rgba(0, 0, 0, 0.2)',
      marginTop: '2px',
    },
  },
  
  // アイコン付きボタン
  withIcon: {
    gap: Spacing.sm,
  },
  
  // アイコンのみのボタン
  iconOnly: {
    minWidth: 'unset',
    width: '40px',
    padding: 0,
  },
  
  // アニメーション付きボタン
  animated: {
    transition: `all ${Animation.duration.normal} ${Animation.easing.spring}`,
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
  
  // フォーカス状態
  focus: {
    outline: `2px solid ${Colors.primary}`,
    outlineOffset: '2px',
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
  pulse: {
    animation: `${Animation.keyframes.pulse} 2s ${Animation.easing.easeInOut} infinite`,
  },
  shake: {
    animation: `${Animation.keyframes.errorShake} 0.5s ${Animation.easing.linear}`,
  },
  bounce: {
    animation: `${Animation.keyframes.bounce} 1s ${Animation.easing.bounce}`,
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

/**
 * ボタンスタイルを生成する関数
 * @param {Object} options - スタイルオプション
 * @param {string} options.variant - ボタンの種類 (primary, secondary, outline など)
 * @param {string} options.size - ボタンのサイズ (small, medium, large など)
 * @param {boolean} options.round - 丸型ボタンかどうか
 * @param {boolean} options.pill - カプセル形状かどうか
 * @param {boolean} options.square - 正方形ボタンかどうか
 * @param {boolean} options.withIcon - アイコン付きかどうか
 * @param {boolean} options.iconOnly - アイコンのみかどうか
 * @param {boolean} options.fullWidth - 幅100%かどうか
 * @param {boolean} options.animated - アニメーション付きかどうか
 * @param {boolean} options.active - アクティブ状態かどうか
 * @param {boolean} options.disabled - 無効状態かどうか
 * @param {Object} options.customStyles - カスタムスタイルオブジェクト
 * @returns {Object} スタイルオブジェクト
 */
export function createButtonStyle({
  variant = 'primary',
  size = 'medium',
  round = false,
  pill = false,
  square = false,
  withIcon = false,
  iconOnly = false,
  fullWidth = false,
  animated = false,
  active = false,
  disabled = false,
  customStyles = {},
}) {
  // 基本スタイル
  let styles = { ...ButtonBaseStyle };
  
  // バリアント適用
  if (ButtonVariants[variant]) {
    styles = StyleHelpers.mergeStyles(styles, ButtonVariants[variant]);
  }
  
  // サイズ適用
  if (fullWidth && ButtonSizes.fullWidth) {
    styles = StyleHelpers.mergeStyles(styles, ButtonSizes.fullWidth);
  } else if (ButtonSizes[size]) {
    styles = StyleHelpers.mergeStyles(styles, ButtonSizes[size]);
  }
  
  // 特殊形状
  if (round) {
    styles = StyleHelpers.mergeStyles(styles, SpecialButtonStyles.round);
  }
  if (pill) {
    styles = StyleHelpers.mergeStyles(styles, SpecialButtonStyles.pill);
  }
  if (square) {
    styles = StyleHelpers.mergeStyles(styles, SpecialButtonStyles.square);
  }
  
  // アイコン関連
  if (withIcon) {
    styles = StyleHelpers.mergeStyles(styles, SpecialButtonStyles.withIcon);
  }
  if (iconOnly) {
    styles = StyleHelpers.mergeStyles(styles, SpecialButtonStyles.iconOnly);
  }
  
  // アニメーション
  if (animated) {
    styles = StyleHelpers.mergeStyles(styles, SpecialButtonStyles.animated);
  }
  
  // 状態
  if (active) {
    styles = StyleHelpers.mergeStyles(styles, SpecialButtonStyles.active);
  }
  if (disabled) {
    styles = StyleHelpers.mergeStyles(styles, SpecialButtonStyles.disabled);
  }
  
  // カスタムスタイル
  if (Object.keys(customStyles).length > 0) {
    styles = StyleHelpers.mergeStyles(styles, customStyles);
  }
  
  return styles;
}

// ボタンのCSSクラスを動的に生成するヘルパー関数
export function getButtonClassName({
  variant = 'default',
  size = 'medium',
  round = false,
  pill = false,
  active = false,
  withIcon = false,
  iconOnly = false,
  fullWidth = false,
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
  
  // 形状
  if (round) {
    classes.push('button--round');
  }
  
  if (pill) {
    classes.push('button--pill');
  }
  
  // 幅100%
  if (fullWidth) {
    classes.push('button--full-width');
  }
  
  // アイコン関連
  if (withIcon) {
    classes.push('button--with-icon');
  }
  
  if (iconOnly) {
    classes.push('button--icon-only');
  }
  
  // 状態
  if (active) {
    classes.push('button--active');
  }
  
  if (disabled) {
    classes.push('button--disabled');
  }
  
  // 追加のクラス名
  if (className) {
    classes.push(className);
  }
  
  return classes.join(' ');
}

// ボタンプリセット
export const ButtonPresets = {
  // メインメニューボタン
  mainMenuButton: createButtonStyle({
    variant: 'menu',
    size: 'large',
    fullWidth: true,
    animated: true,
    customStyles: {
      marginBottom: Spacing.md,
      fontSize: Typography.fontSizes.xl,
      letterSpacing: '2px', // Typography.letterSpacing.wideの代わりに直接指定
    }
  }),
  
  // 難易度選択ボタン
  difficultyButton: createButtonStyle({
    variant: 'outline',
    size: 'medium',
    animated: true,
    customStyles: SpecialButtonStyles.difficulty,
  }),
  
  // リトライボタン
  retryButton: createButtonStyle({
    variant: 'primary',
    size: 'large',
    withIcon: true,
    animated: true,
    customStyles: {
      boxShadow: Effects.shadows.md,
    }
  }),
  
  // 戻るボタン
  backButton: createButtonStyle({
    variant: 'outline',
    size: 'medium',
    withIcon: true,
    customStyles: {
      marginTop: Spacing.lg,
    }
  }),
  
  // 設定トグル
  settingToggle: createButtonStyle({
    variant: 'toggle',
    size: 'medium',
    customStyles: {
      width: '100px',
    }
  }),
  
  // アイコンボタン
  iconButton: createButtonStyle({
    variant: 'ghost',
    size: 'medium',
    round: true,
    iconOnly: true,
  }),
  
  // 共有ボタン
  shareButton: createButtonStyle({
    variant: 'secondary',
    size: 'medium',
    withIcon: true,
  }),
  
  // サブミットボタン
  submitButton: createButtonStyle({
    variant: 'primary',
    size: 'large',
    animated: true,
    customStyles: {
      fontWeight: Typography.fontWeights.bold,
    }
  }),
};

export default {
  ButtonBaseStyle,
  ButtonVariants,
  ButtonSizes,
  SpecialButtonStyles,
  ButtonAnimations,
  createButtonStyle,
  getButtonClassName,
  ButtonPresets,
};