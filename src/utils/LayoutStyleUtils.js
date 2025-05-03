/**
 * レイアウト関連のスタイル定義を集約したユーティリティ
 * 
 * プロジェクト全体で使用されるカードやコンテナなどのレイアウト要素のスタイルを一元管理し、
 * 一貫性のあるUI設計を実現します。デザイントークンと連携して使用します。
 */

import { Colors, Typography, Spacing, Layout, Animation } from './DesignTokens';

// ゲームコンテナのスタイル
export const ContainerStyles = {
  // メインゲームコンテナ
  gameContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: Layout.maxWidth.content,
    height: Layout.height.gameContainer,
    margin: '0 auto',
    backgroundColor: '#0d1117',
    border: `${Layout.border.medium} ${Colors.cardBorder}`,
    boxShadow: `0 0 20px rgba(0, 0, 0, 0.4), inset 0 0 30px rgba(255, 140, 0, 0.1)`,
    position: 'relative',
    overflow: 'hidden',
    color: Colors.foreground,
    fontFamily: Typography.fontFamily.normal,
  },
  
  // ヘッダーコンテナ
  header: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '1.2rem 2.5rem',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    zIndex: 1,
  },
  
  // メインエリア
  gameArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: '1.5rem',
    paddingBottom: '6.5rem',
    zIndex: 1,
    position: 'relative',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255, 140, 0, 0.3) rgba(0, 0, 0, 0.2)',
  },
  
  // メニュー画面コンテナ
  menuContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100%',
    padding: Spacing.lg,
    position: 'relative',
  },
  
  // 中央揃えセクション
  centeredSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: Spacing.lg,
    margin: Spacing.margin.section,
  },
};

// カードスタイル
export const CardStyles = {
  // 基本カードスタイル
  baseCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.padding.card,
    boxShadow: `0 10px 40px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.05)`,
    border: `1px solid ${Colors.cardBorder}`,
    position: 'relative',
    transition: `box-shadow ${Animation.duration.normal} ${Animation.easing.easeOut}, transform ${Animation.duration.fast} ${Animation.easing.easeOut}`,
  },
  
  // タイピングエリア
  typingArea: {
    width: '90%',
    maxWidth: '700px',
    minHeight: '180px',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
  },
  
  // 結果カード
  resultCard: {
    width: '100%',
    maxWidth: '500px',
    margin: '0 auto',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(10px)',
  },
  
  // メニューカード
  menuCard: {
    width: '100%',
    maxWidth: '500px',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    border: `1px solid rgba(255, 140, 0, 0.2)`,
  },
  
  // アイテムカード
  itemCard: {
    padding: Spacing.lg,
    margin: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: Layout.borderRadius.md,
    transition: `all ${Animation.duration.normal} ${Animation.easing.easeOut}`,
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
      border: `1px solid ${Colors.cardBorder}`,
    },
  },
};

// 共通グリッドスタイル
export const GridStyles = {
  // 汎用グリッド
  grid: {
    display: 'grid',
    gap: Spacing.md,
    width: '100%',
  },
  
  // 自動調整グリッド
  autoGrid: (minWidth = '250px') => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
    gap: Spacing.md,
    width: '100%',
  }),
  
  // 2カラムグリッド
  twoColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: Spacing.md,
    width: '100%',
  },
  
  // 3カラムグリッド
  threeColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: Spacing.md,
    width: '100%',
  },
};

// フレックスボックスレイアウト
export const FlexStyles = {
  // 行レイアウト（横並び）
  row: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // 行レイアウト（横並び、等間隔）
  rowBetween: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  // 列レイアウト（縦並び）
  column: {
    display: 'flex',
    flexDirection: 'column',
  },
  
  // 列レイアウト（縦並び、中央揃え）
  columnCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  
  // 中央揃えフレックス
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

// 共通ユーティリティスタイル
export const UtilityStyles = {
  // マージン
  margin: {
    xs: { margin: Spacing.xs },
    sm: { margin: Spacing.sm },
    md: { margin: Spacing.md },
    lg: { margin: Spacing.lg },
    xl: { margin: Spacing.xl },
    none: { margin: 0 },
  },
  
  // パディング
  padding: {
    xs: { padding: Spacing.xs },
    sm: { padding: Spacing.sm },
    md: { padding: Spacing.md },
    lg: { padding: Spacing.lg },
    xl: { padding: Spacing.xl },
    none: { padding: 0 },
  },
  
  // テキスト配置
  textAlign: {
    left: { textAlign: 'left' },
    center: { textAlign: 'center' },
    right: { textAlign: 'right' },
  },
  
  // 表示・非表示
  display: {
    block: { display: 'block' },
    inline: { display: 'inline' },
    inlineBlock: { display: 'inline-block' },
    flex: { display: 'flex' },
    grid: { display: 'grid' },
    none: { display: 'none' },
  },
  
  // 位置指定
  position: {
    relative: { position: 'relative' },
    absolute: { position: 'absolute' },
    fixed: { position: 'fixed' },
    sticky: { position: 'sticky' },
  },
  
  // オーバーフロー
  overflow: {
    hidden: { overflow: 'hidden' },
    auto: { overflow: 'auto' },
    scroll: { overflow: 'scroll' },
    visible: { overflow: 'visible' },
  },
};

// アニメーションスタイル
export const AnimationStyles = {
  fadeIn: {
    animation: `${Animation.keyframes.fadeIn} ${Animation.duration.normal} ${Animation.easing.easeOut}`,
  },
  fadeInUp: {
    animation: `${Animation.keyframes.fadeInUp} ${Animation.duration.normal} ${Animation.easing.easeOut}`,
  },
  errorShake: {
    animation: `${Animation.keyframes.errorShake} ${Animation.duration.fast} ${Animation.easing.bounce} both`,
    transform: 'translate3d(0, 0, 0)',
    backfaceVisibility: 'hidden',
  },
};

// ヘルパー関数：複数のスタイルをマージする
export function mergeStyles(...styles) {
  return Object.assign({}, ...styles);
}