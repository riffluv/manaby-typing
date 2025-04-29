import React, { memo } from 'react';
import styles from '../../styles/GameScreen.module.css';

/**
 * タイピングテキスト表示コンポーネント
 * タイピングゲームの問題文、入力済みテキスト、現在の入力を表示する
 * 
 * @param {Object} props
 * @param {string} props.displayRomaji - 表示するローマ字テキスト
 * @param {Object} props.coloringInfo - 色分け情報
 * @param {boolean} props.isCompleted - タイピング完了フラグ
 * @param {string} props.currentInput - ユーザーの現在の入力
 * @param {boolean} props.errorAnimation - エラーアニメーションフラグ
 */
const TypingDisplay = ({ 
  displayRomaji, 
  coloringInfo, 
  isCompleted, 
  currentInput = '',
  errorAnimation = false
}) => {
  // パフォーマンス向上のためコンソール出力を開発環境のみに制限
  if (process.env.NODE_ENV === 'development') {
    console.debug('[TypingDisplay] レンダリング:', { 
      displayRomajiLength: displayRomaji?.length,
      isCompleted
    });
  }

  if (!displayRomaji) return null;

  // 完了状態の場合
  if (isCompleted) {
    return (
      <div className={styles.typingRomaji}>
        <span className={styles.completed}>{displayRomaji}</span>
      </div>
    );
  }

  // 通常表示
  const typedIndex = coloringInfo?.typedLength || 0;
  const currentPosition = coloringInfo?.currentPosition || 0;
  const currentDisplay = coloringInfo?.currentDisplay || '';
  const typed = displayRomaji.substring(0, typedIndex);
  const remaining = displayRomaji.substring(
    currentPosition + currentInput.length
  );

  return (
    <div className={styles.typingRomaji} data-testid="typing-display">
      <span className={styles.completed}>{typed}</span>
      {currentInput && <span className={styles.current}>{currentInput}</span>}
      {currentDisplay && currentInput.length < currentDisplay.length && (
        <span>{currentDisplay.substring(currentInput.length)}</span>
      )}
      <span className={errorAnimation ? styles.error : ''}>{remaining}</span>
    </div>
  );
};

// カスタム比較関数: プロップが実質的に変わった場合のみ再レンダリング
const arePropsEqual = (prevProps, nextProps) => {
  // 完了状態が変わった場合は更新
  if (prevProps.isCompleted !== nextProps.isCompleted) return false;
  
  // エラーアニメーション状態が変わった場合は更新
  if (prevProps.errorAnimation !== nextProps.errorAnimation) return false;
  
  // displayRomaji が変わった場合は更新
  if (prevProps.displayRomaji !== nextProps.displayRomaji) return false;
  
  // currentInput が変わった場合は更新
  if (prevProps.currentInput !== nextProps.currentInput) return false;
  
  // coloringInfo の重要な部分だけを比較
  if (prevProps.coloringInfo?.typedLength !== nextProps.coloringInfo?.typedLength) return false;
  if (prevProps.coloringInfo?.currentPosition !== nextProps.coloringInfo?.currentPosition) return false;
  
  // それ以外は再レンダリングしない
  return true;
};

// React.memo でコンポーネントをラップし、カスタム比較関数を使用
export default memo(TypingDisplay, arePropsEqual);