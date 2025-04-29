import React, { useMemo, memo } from 'react';
import styles from '../../styles/GameScreen.module.css';

/**
 * タイピングの表示を担当するコンポーネント
 * タイピングマニアの設計から学んだ視覚的フィードバックを実装
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
      color: 'var(--typed-text-color, #4caf50)',
      opacity: 1
    };
    
    // 入力中の文字のスタイル
    const currentInputStyle = { 
      color: 'var(--current-input-color, #2196f3)',
      textDecoration: 'underline',
      position: 'relative',
      opacity: 1
    };
    
    // 未入力の文字のスタイル - カーソルの近くの文字はやや強調
    const notTypedStyle = { 
      color: 'var(--not-typed-color, #757575)',
      opacity: 0.8
    };
    
    // 次に入力すべき文字のスタイル（より目立つように）
    const nextCharStyle = {
      color: 'var(--next-char-color, #b0bec5)', 
      opacity: 0.95,
      position: 'relative',
      fontWeight: 700
    };
    
    return {
      typed: typedStyle,
      current: currentInputStyle,
      notTyped: notTypedStyle,
      nextChar: nextCharStyle,
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
    
    // テキストを複数のパーツに分割（タイピングマニアのアプローチ）
    const typedText = displayRomaji.substring(0, typedLength);
    const currentText = displayRomaji.substring(
      currentPosition, 
      currentPosition + currentInputLength
    );
    const nextChar = displayRomaji.charAt(currentPosition + currentInputLength);
    const restText = displayRomaji.substring(
      currentPosition + currentInputLength + 1
    );
    
    return (
      <>
        {/* 入力済み部分 */}
        {typedText && <span style={textStyles.typed}>{typedText}</span>}
        
        {/* 現在の入力中部分 */}
        {currentInput && (
          <span style={textStyles.current}>{currentInput}</span>
        )}
        
        {/* 次に入力すべき文字を特別に強調（タイピングマニア風） */}
        {nextChar && (
          <span style={textStyles.nextChar} className={styles.nextCharHighlight}>{nextChar}</span>
        )}
        
        {/* 残りの未入力部分 */}
        {restText && <span style={textStyles.notTyped}>{restText}</span>}
      </>
    );
  }, [displayRomaji, coloringInfo, currentInput, isCompleted, textStyles]);

  return (
    <div 
      className={`${styles.typingText} ${errorAnimation ? styles.errorShake : ''}`}
      style={{ 
        willChange: 'transform', 
        contain: 'content',
        transition: 'all 0.2s ease-out'
      }}
    >
      {displayText}
      
      {/* タイピングマニアのようなカーソルフィードバック（視覚的なリズム） */}
      {!isCompleted && (
        <span className={styles.typingCursor}></span>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // 高度な比較関数でメモ化を最適化
  // 実際に変更があった場合のみ再レンダリング
  if (prevProps.isCompleted !== nextProps.isCompleted) return false;
  if (prevProps.errorAnimation !== nextProps.errorAnimation) return false;
  if (prevProps.displayRomaji !== nextProps.displayRomaji) return false;
  if (prevProps.currentInput !== nextProps.currentInput) return false;
  
  const prevColoring = prevProps.coloringInfo || {};
  const nextColoring = nextProps.coloringInfo || {};
  
  if (prevColoring.typedLength !== nextColoring.typedLength) return false;
  if (prevColoring.currentInputLength !== nextColoring.currentInputLength) return false;
  if (prevColoring.currentPosition !== nextColoring.currentPosition) return false;
  
  return true;
});

// 表示名を設定（デバッグ用）
TypingDisplay.displayName = 'TypingDisplay';

export default TypingDisplay;
