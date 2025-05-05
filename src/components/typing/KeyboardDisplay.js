'use client';

import React, { useEffect, useState } from 'react';
import styles from '../../styles/typing/KeyboardDisplay.module.css';
import { motion } from 'framer-motion';

/**
 * キーボード表示コンポーネント
 * 次に入力すべきキーを視覚的にハイライトし、キーボードレイアウトを表示するBEM準拠コンポーネント
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.activeKey - ハイライトすべき現在のアクティブなキー
 * @param {string} props.lastPressedKey - 最後に押されたキー
 * @param {boolean} [props.showHints=true] - キーヒント表示するかどうか
 * @param {string} [props.layout='jp'] - キーボードレイアウト ('jp'または'en')
 * @param {boolean} [props.compact=false] - コンパクトモード
 * @param {string} [props.className=''] - 追加のカスタムクラス名
 * @returns {React.ReactElement}
 */
const KeyboardDisplay = ({
  activeKey,
  lastPressedKey,
  showHints = true,
  layout = 'jp',
  compact = false,
  className = ''
}) => {
  // キーボードレイアウト定義
  const [keyboardLayout, setKeyboardLayout] = useState([]);
  
  // アクティブキーと最後に押されたキーの状態管理
  const [currentActiveKey, setCurrentActiveKey] = useState('');
  const [prevActiveKey, setPrevActiveKey] = useState('');

  // キーボードレイアウト設定
  useEffect(() => {
    // 日本語キーボードレイアウト
    const jpLayout = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '^', '¥'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '@', '['],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ':', ']'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '\\'],
      ['space']
    ];
    
    // 英語キーボードレイアウト
    const enLayout = [
      ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\''],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
      ['space']
    ];
    
    setKeyboardLayout(layout === 'jp' ? jpLayout : enLayout);
  }, [layout]);

  // アクティブキーを更新する
  useEffect(() => {
    if (activeKey !== currentActiveKey) {
      setPrevActiveKey(currentActiveKey);
      setCurrentActiveKey(activeKey?.toLowerCase() || '');
    }
  }, [activeKey, currentActiveKey]);

  // BEM記法に基づくクラス名の生成
  const keyboardClasses = [
    styles.keyboard,
    compact ? styles['keyboard--compact'] : '',
    styles[`keyboard--${layout}`],
    className
  ].filter(Boolean).join(' ');

  // キー要素をレンダリングする関数
  const renderKey = (key) => {
    const isSpace = key === 'space';
    const isActive = key.toLowerCase() === currentActiveKey?.toLowerCase();
    const isLastPressed = key.toLowerCase() === lastPressedKey?.toLowerCase();
    
    const keyClasses = [
      styles.keyboard__key,
      isSpace ? styles['keyboard__key--space'] : '',
      isActive ? styles['keyboard__key--active'] : '',
      isLastPressed ? styles['keyboard__key--pressed'] : '',
      showHints && isActive ? styles['keyboard__key--hint'] : ''
    ].filter(Boolean).join(' ');

    // キー表示内容
    const keyDisplay = isSpace ? '␣' : key;

    return (
      <motion.div 
        key={key} 
        className={keyClasses}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {keyDisplay}
        {isActive && showHints && (
          <motion.div
            className={styles.keyboard__key_highlight}
            layoutId="key-highlight"
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        )}
      </motion.div>
    );
  };

  // キーボードレイアウトをレンダリング
  return (
    <div className={keyboardClasses}>
      {keyboardLayout.map((row, rowIndex) => (
        <div key={rowIndex} className={styles.keyboard__row}>
          {row.map((key) => renderKey(key))}
        </div>
      ))}
    </div>
  );
};

export default KeyboardDisplay;