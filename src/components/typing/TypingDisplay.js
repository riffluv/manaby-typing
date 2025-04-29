import React, { useMemo, memo } from 'react';
import styles from '../../styles/GameScreen.module.css';

/**
 * タイピングの表示を担当するコンポーネント
 * パフォーマンス最適化のためにメモ化を実装
 */
const TypingDisplay = memo(({
  displayRomaji,
  coloringInfo,
  isCompleted,
  currentInput,
  errorAnimation
}) => {
  // 文字色分け用のスタイルオブジェクト - useMemoでレンダリング最適化
  const textStyles = useMemo(() => {
    const { typedLength = 0, currentInputLength = 0 } = coloringInfo || {};
    
    // 完了した文字のスタイル
    const typedStyle = { 
      color: 'var(--typed-text-color, #4caf50)'
    };
    
    // 入力中の文字のスタイル
    const currentInputStyle = { 
      color: 'var(--current-input-color, #2196f3)',
      textDecoration: 'underline'
    };
    
    // 未入力の文字のスタイル
    const notTypedStyle = { 
      color: 'var(--not-typed-color, #757575)'
    };
    
    return {
      typed: typedStyle,
      current: currentInputStyle,
      notTyped: notTypedStyle,
      typedLength,
      currentInputLength
    };
  }, [coloringInfo]);
  
  // 現在の入力を含むテキスト表示 - useMemoでレンダリング最適化
  const displayText = useMemo(() => {
    if (!displayRomaji) return null;
    
    // 全体が完了した場合
    if (isCompleted) {
      return <span style={textStyles.typed}>{displayRomaji}</span>;
    }
    
    const { typedLength, currentInputLength } = textStyles;
    const currentPosition = coloringInfo?.currentPosition || 0;
    
    // テキストを3つのパートに分割
    const typedText = displayRomaji.substring(0, typedLength);
    const currentText = displayRomaji.substring(
      currentPosition, 
      currentPosition + currentInputLength
    );
    const untypedText = displayRomaji.substring(
      currentPosition + currentInputLength
    );
    
    return (
      <>
        {/* 入力済み部分 */}
        {typedText && <span style={textStyles.typed}>{typedText}</span>}
        
        {/* 現在の入力中部分 */}
        {currentInput && (
          <span style={textStyles.current}>{currentInput}</span>
        )}
        
        {/* 未入力部分 */}
        {untypedText && <span style={textStyles.notTyped}>{untypedText}</span>}
      </>
    );
  }, [displayRomaji, coloringInfo, currentInput, isCompleted, textStyles]);

  return (
    <div 
      className={`${styles.typingText} ${errorAnimation ? styles.errorShake : ''}`}
      style={{ willChange: 'transform', contain: 'content' }} // GPU高速化
    >
      {displayText}
    </div>
  );
}, (prevProps, nextProps) => {
  // 高度な比較関数でメモ化を最適化
  // 実際に変更があった場合のみ再レンダリング
  
  // 完了状態の変化を比較
  if (prevProps.isCompleted !== nextProps.isCompleted) {
    return false; // 異なる場合は再レンダリング
  }
  
  // エラーアニメーション状態の変化を比較
  if (prevProps.errorAnimation !== nextProps.errorAnimation) {
    return false; // 異なる場合は再レンダリング
  }
  
  // 表示テキストの変化を比較
  if (prevProps.displayRomaji !== nextProps.displayRomaji) {
    return false; // 異なる場合は再レンダリング
  }
  
  // 現在の入力テキストの変化を比較
  if (prevProps.currentInput !== nextProps.currentInput) {
    return false; // 異なる場合は再レンダリング
  }
  
  // 色分け情報の変化を比較（最も頻繁に変わる部分）
  const prevColoring = prevProps.coloringInfo || {};
  const nextColoring = nextProps.coloringInfo || {};
  
  // typedLengthの変化
  if (prevColoring.typedLength !== nextColoring.typedLength) {
    return false; // 異なる場合は再レンダリング
  }
  
  // currentInputLengthの変化
  if (prevColoring.currentInputLength !== nextColoring.currentInputLength) {
    return false; // 異なる場合は再レンダリング
  }
  
  // currentPositionの変化
  if (prevColoring.currentPosition !== nextColoring.currentPosition) {
    return false; // 異なる場合は再レンダリング
  }
  
  // 変更がないため再レンダリングしない
  return true;
});

// 表示名を設定（デバッグ用）
TypingDisplay.displayName = 'TypingDisplay';

export default TypingDisplay;
