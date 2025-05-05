'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/common/ModeSelector.module.css';

/**
 * モード選択コンポーネント
 * ゲームモードや難易度などの選択肢をBEM記法に準拠したUI表示
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {Array} props.options - 選択オプション配列 [{ id: string, label: string, icon?: string }]
 * @param {string} props.selectedId - 現在選択されているオプションID
 * @param {function} props.onChange - 選択変更時のコールバック関数
 * @param {string} [props.title=''] - セレクターのタイトル
 * @param {string} [props.layout='horizontal'] - レイアウト ('horizontal' または 'vertical')
 * @param {string} [props.size='medium'] - サイズ ('small', 'medium', 'large')
 * @param {boolean} [props.disabled=false] - 無効状態
 * @param {boolean} [props.showLabel=true] - ラベル表示の有無
 * @param {string} [props.className=''] - 追加のカスタムクラス名
 * @returns {React.ReactElement}
 */
const ModeSelector = ({
  options,
  selectedId,
  onChange,
  title = '',
  layout = 'horizontal',
  size = 'medium',
  disabled = false,
  showLabel = true,
  className = ''
}) => {
  // BEM記法に基づくクラス名の生成
  const rootClassName = [
    styles.mode_selector,
    styles[`mode_selector--${layout}`],
    styles[`mode_selector--${size}`],
    disabled ? styles['mode_selector--disabled'] : '',
    className
  ].filter(Boolean).join(' ');

  // オプション選択ハンドラー
  const handleSelect = useCallback((id) => {
    if (!disabled && id !== selectedId) {
      onChange(id);
    }
  }, [disabled, selectedId, onChange]);

  return (
    <div className={rootClassName} role="radiogroup" aria-label={title}>
      {title && (
        <div className={styles.mode_selector__title}>{title}</div>
      )}

      <div className={styles.mode_selector__options}>
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          const optionClassName = [
            styles.mode_selector__option,
            isSelected ? styles['mode_selector__option--selected'] : '',
          ].filter(Boolean).join(' ');

          return (
            <motion.div
              key={option.id}
              className={optionClassName}
              onClick={() => handleSelect(option.id)}
              whileHover={!disabled ? { scale: 1.05 } : undefined}
              whileTap={!disabled ? { scale: 0.95 } : undefined}
              role="radio"
              aria-checked={isSelected}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                  e.preventDefault();
                  handleSelect(option.id);
                }
              }}
            >
              {option.icon && (
                <span className={styles.mode_selector__icon}>{option.icon}</span>
              )}
              {showLabel && (
                <span className={styles.mode_selector__label}>{option.label}</span>
              )}

              {isSelected && (
                <motion.div
                  className={styles.mode_selector__selection_indicator}
                  layoutId="selection-indicator"
                  transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ModeSelector;