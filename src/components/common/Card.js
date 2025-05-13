'use client';

import React from 'react';
import styles from '../../styles/common/Card.module.css';

/**
 * カードコンポーネント
 * 情報をグループ化して表示するためのBEM記法準拠コンテナ
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {React.ReactNode} props.children - カード内に表示する子要素
 * @param {string} [props.title] - カードのタイトル
 * @param {React.ReactNode} [props.icon] - カードのアイコン
 * @param {string} [props.variant='default'] - カードのバリエーション ('default', 'outlined', 'elevated')
 * @param {string} [props.size='medium'] - カードのサイズ ('small', 'medium', 'large')
 * @param {boolean} [props.hoverable=false] - ホバー効果を適用するかどうか
 * @param {boolean} [props.clickable=false] - クリック可能であることを示す効果を適用するかどうか
 * @param {React.ReactNode} [props.footer] - カードのフッターに表示するコンテンツ
 * @param {React.ReactNode} [props.actions] - カードのアクション領域に表示するコンテンツ
 * @param {string} [props.className=''] - 追加のカスタムクラス名
 * @param {Function} [props.onClick] - カードクリック時のコールバック関数
 * @returns {React.ReactElement}
 */
const Card = ({
  children,
  title,
  icon,
  variant = 'default',
  size = 'medium',
  hoverable = false,
  clickable = false,
  footer,
  actions,
  className = '',
  onClick,
  ...props
}) => {
  // BEM記法に基づくクラス名の生成
  const cardClasses = [
    styles.card,
    variant !== 'default' ? styles[`card--${variant}`] : '',
    size !== 'medium' ? styles[`card--${size}`] : '',
    hoverable ? styles['card--hoverable'] : '',
    clickable ? styles['card--clickable'] : '',
    onClick ? styles['card--interactive'] : '',
    className
  ].filter(Boolean).join(' ');

  // クリックイベントハンドラー
  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
      {...props}
    >
      {(title || icon) && (
        <div className={styles.card__header}>
          {icon && <span className={styles.card__icon}>{icon}</span>}
          {title && <h3 className={styles.card__title}>{title}</h3>}
        </div>
      )}

      <div className={styles.card__content}>
        {children}
      </div>

      {actions && (
        <div className={styles.card__actions}>
          {actions}
        </div>
      )}

      {footer && (
        <div className={styles.card__footer}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;