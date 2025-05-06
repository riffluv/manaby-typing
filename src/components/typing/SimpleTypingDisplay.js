import React, { memo, useRef, useEffect } from 'react';
import styles from '../../styles/typing/SimpleTypingDisplay.module.css';

/**
 * シンプルなタイピング表示コンポーネント（完全リファクタリング版）
 * 
 * 長いローマ字でもフォーカス文字が常に適切な位置に表示されるよう最適化
 * スクロールや表示位置の自動調整機能を実装
 * MCPとの連携強化
 */
const SimpleTypingDisplay = memo(({
  romaji,            // 表示するローマ字全体
  typedLength = 0,   // 入力済み文字数
  nextChar = '',     // 次に入力すべき文字
  isError = false,   // エラー状態
  className = '',    // 外部から適用するクラス名
  inputMode = 'normal', // 入力モード（normal/consonant）
  currentInput = '',  // 現在入力中の文字
  currentCharRomaji = '', // 現在入力中の文字の完全なローマ字表現
  visiblePortion = { start: 0, end: 0 } // 表示領域の範囲（長いローマ字時）
}) => {
  // スクロール処理用のref
  const containerRef = useRef(null);
  const nextCharRef = useRef(null);
  const contentRef = useRef(null);

  // 入力済み部分（typedLength文字まで）
  const typed = romaji?.substring(0, typedLength) || '';

  // 表示用の変数を準備
  let displayCurrentInput = '';
  let displayNextChar = nextChar || '';
  let displayRemaining = '';
  
  // 表示範囲を決定（長いローマ字の場合は表示範囲を制限）
  const showFullText = !visiblePortion || visiblePortion.start === 0 && visiblePortion.end === 0;
  
  // 実際に表示するテキスト部分を決定
  const effectiveRomaji = showFullText ? romaji : 
    (romaji?.substring(visiblePortion.start, visiblePortion.end) || '');
  
  // 表示範囲内での相対的な入力位置を計算
  const relativeTypedLength = Math.max(0, typedLength - (showFullText ? 0 : visiblePortion.start));

  // 入力モードによって表示方法を変更
  if (inputMode === 'consonant' && currentInput) {
    // 子音入力中の特殊処理
    // 例: t -> ta の変換中なら、「t」を表示し「a」をハイライト
    displayCurrentInput = currentInput;

    // 次に入力すべき文字（母音部分）を特定
    if (currentCharRomaji && currentCharRomaji.length > currentInput.length) {
      displayNextChar = currentCharRomaji.charAt(currentInput.length);
    } else {
      displayNextChar = 'a'; // フォールバック
    }

    // 残りの部分の計算
    const remainingStartPos = typedLength + currentCharRomaji.length;
    
    if (showFullText) {
      displayRemaining = romaji?.substring(remainingStartPos) || '';
    } else {
      // 表示範囲内のみの残り部分を計算
      const relativeRemainStart = Math.max(0, remainingStartPos - visiblePortion.start);
      displayRemaining = effectiveRomaji?.substring(relativeRemainStart) || '';
    }
  } else {
    // 通常モードでの表示処理
    displayNextChar = nextChar;
    
    if (showFullText) {
      const remainingStartPos = typedLength + (nextChar ? 1 : 0);
      displayRemaining = romaji?.substring(remainingStartPos) || '';
    } else {
      // 表示範囲内のみの残り部分を計算
      const relativeNextCharPos = relativeTypedLength + (nextChar ? 1 : 0);
      displayRemaining = effectiveRomaji?.substring(relativeNextCharPos) || '';
    }
  }

  // フォーカス文字の可視化を保証するためのスクロール処理
  useEffect(() => {
    // フォーカス文字の要素と親コンテナが両方存在する場合
    if (nextCharRef.current && containerRef.current) {
      try {
        // フォーカス文字の位置にスクロール
        const nextCharElem = nextCharRef.current;
        const container = containerRef.current;

        // フォーカス文字の位置を取得
        const nextCharRect = nextCharElem.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // コンテナ内でのフォーカス文字の相対位置を計算
        const isInView = (
          nextCharRect.top >= containerRect.top &&
          nextCharRect.bottom <= containerRect.bottom
        );

        // フォーカス文字が見えていない場合はスクロール調整
        if (!isInView) {
          // スクロール位置を計算
          // フォーカス文字を中央に配置
          const targetScrollTop = nextCharElem.offsetTop - 
            (container.clientHeight / 2) + (nextCharElem.offsetHeight / 2);
          
          // スムーズスクロール
          container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        }
      } catch (error) {
        console.error('フォーカス文字のスクロール処理エラー:', error);
      }
    }
  }, [typedLength, nextChar, displayNextChar, inputMode]);

  // マウント時、または表示範囲が変更されたときもスクロール位置を更新
  useEffect(() => {
    if (containerRef.current && contentRef.current) {
      if (typedLength > 0) {
        // テキストの入力位置に応じてコンテンツの位置を自動調整
        containerRef.current.scrollLeft = 0;
      }
    }
  }, [visiblePortion, typedLength]);

  // 外部クラスと内部クラスを結合
  const containerClass = `${styles.typingText} ${className || ''} ${isError ? styles.errorShake : ''}`;

  // romaji全体が空の場合は空白表示
  if (!romaji) {
    return (
      <div className={containerClass} ref={containerRef}>
        <span className={styles.typingCursor}></span>
      </div>
    );
  }

  // 部分表示の場合に前後に表示する省略記号
  const prefixEllipsis = !showFullText && visiblePortion.start > 0 ? '...' : '';
  const suffixEllipsis = !showFullText && visiblePortion.end < romaji.length ? '...' : '';

  return (
    <div className={containerClass} ref={containerRef}>
      <div className={styles.typingTextContent} ref={contentRef}>
        {/* 前の部分が省略されている場合の省略記号 */}
        {prefixEllipsis && (
          <span className={styles.ellipsis}>{prefixEllipsis}</span>
        )}

        {/* 入力済み部分 */}
        {typed && (
          <span className={styles.typed}>
            {showFullText 
              ? typed 
              : effectiveRomaji.substring(0, relativeTypedLength)}
          </span>
        )}

        {/* 子音入力中の場合は、子音も表示 */}
        {inputMode === 'consonant' && displayCurrentInput && (
          <span className={styles.consonant}>{displayCurrentInput}</span>
        )}

        {/* 次に入力すべき文字（ハイライト表示） */}
        {displayNextChar && (
          <span className={styles.nextChar} ref={nextCharRef}>
            {displayNextChar}
          </span>
        )}

        {/* 子音入力中の場合は、現在の仮名の残りを表示 */}
        {inputMode === 'consonant' && currentCharRomaji && currentCharRomaji.length > (currentInput?.length || 0) + 1 && (
          <span className={styles.currentCharRemaining}>
            {currentCharRomaji.substring((currentInput?.length || 0) + 1)}
          </span>
        )}

        {/* 残りの未入力部分 */}
        {displayRemaining && <span className={styles.remaining}>{displayRemaining}</span>}

        {/* 後の部分が省略されている場合の省略記号 */}
        {suffixEllipsis && (
          <span className={styles.ellipsis}>{suffixEllipsis}</span>
        )}
        
        {/* タイピングカーソル */}
        <span className={styles.typingCursor}></span>
      </div>
    </div>
  );
});

// コンポーネント名を設定（デバッグ用）
SimpleTypingDisplay.displayName = 'SimpleTypingDisplay';

export default SimpleTypingDisplay;