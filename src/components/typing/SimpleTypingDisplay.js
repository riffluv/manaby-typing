import React, { memo, useRef, useEffect, useCallback } from 'react';
import styles from '../../styles/typing/SimpleTypingDisplay.module.css';

// デバッグログフラグ - デフォルトで無効化
const DEBUG_TYPING_DISPLAY = process.env.NODE_ENV === 'development' && false;

/**
 * シンプルなタイピング表示コンポーネント（最適化版）
 *
 * 長いローマ字でもフォーカス文字が常に適切な位置に表示されるよう最適化
 * スクロールや表示位置の自動調整機能を実装
 * MCPとの連携強化
 * パフォーマンス最適化済み
 */
const SimpleTypingDisplay = memo(
  ({
    romaji, // 表示するローマ字全体
    typedLength = 0, // 入力済み文字数
    nextChar = '', // 次に入力すべき文字
    isError = false, // エラー状態
    className = '', // 外部から適用するクラス名
    inputMode = 'normal', // 入力モード（normal/consonant）
    currentInput = '', // 現在入力中の文字
    currentCharRomaji = '', // 現在入力中の文字の完全なローマ字表現
    visiblePortion = { start: 0, end: 0 }, // 表示領域の範囲（長いローマ字時）
  }) => {
    // 安全チェック機能強化のため追加
    const isValidRomaji = typeof romaji === 'string';
    const isValidNextChar = typeof nextChar === 'string';
    const isValidCurrentInput = typeof currentInput === 'string';

    if (
      DEBUG_TYPING_DISPLAY &&
      (!isValidRomaji || !isValidNextChar || !isValidCurrentInput)
    ) {
      console.warn('SimpleTypingDisplay - 無効なデータ:', {
        romaji: isValidRomaji
          ? romaji.substring(0, 10) + '...'
          : `${typeof romaji} (無効)`,
        nextChar: isValidNextChar ? nextChar : `${typeof nextChar} (無効)`,
        currentInput: isValidCurrentInput
          ? currentInput
          : `${typeof currentInput} (無効)`,
      });
    }
    // スクロール処理用のref
    const containerRef = useRef(null);
    const nextCharRef = useRef(null);
    const contentRef = useRef(null);

    // 前回のスクロール位置を記憶するref
    const lastScrollPositionRef = useRef(null);

    // 前回のフォーカス文字位置を記憶するref (パフォーマンス向上のため)
    const lastTypedLengthRef = useRef(typedLength);

    // ローマ字が存在するか確認（デバッグ情報も出力）
    if (DEBUG_TYPING_DISPLAY) {
      console.log(
        'SimpleTypingDisplay - 受け取ったromaji:',
        JSON.stringify({
          romaji: romaji || '<なし>',
          typedLength,
          nextChar: nextChar || '<なし>',
        })
      );
    }
    // romajiがない場合のセーフティチェック - 改善強化版
    const safeRomaji = typeof romaji === 'string' ? romaji : '';

    if (DEBUG_TYPING_DISPLAY && !romaji && romaji !== '') {
      console.warn(
        'SimpleTypingDisplay - romaji が undefined または null です:',
        romaji
      );
    }

    // 入力済み部分（typedLength文字まで） - セーフティチェック付き
    const validTypedLength =
      Number.isInteger(typedLength) && typedLength >= 0 ? typedLength : 0;
    const typed = safeRomaji.substring(0, validTypedLength) || '';

    // 表示用の変数を準備 - 型チェック強化
    let displayCurrentInput =
      typeof currentInput === 'string' ? currentInput : '';
    let displayNextChar = typeof nextChar === 'string' ? nextChar : '';
    let displayRemaining = '';

    // 表示範囲を決定（長いローマ字の場合は表示範囲を制限） - 全体的に強化
    const showFullText =
      !visiblePortion ||
      (visiblePortion.start === 0 && visiblePortion.end === 0) ||
      !Number.isInteger(visiblePortion.start) ||
      !Number.isInteger(visiblePortion.end);

    // セーフティチェック強化: visiblePortionの有効性をより厳密に検証
    const hasValidRange =
      visiblePortion &&
      typeof visiblePortion === 'object' &&
      Number.isInteger(visiblePortion.start) &&
      Number.isInteger(visiblePortion.end) &&
      visiblePortion.start >= 0 &&
      visiblePortion.end > visiblePortion.start &&
      visiblePortion.end <= safeRomaji.length;

    // 有効範囲に基づいて表示テキストを決定
    const effectiveRomaji =
      !hasValidRange || showFullText
        ? safeRomaji
        : safeRomaji.substring(visiblePortion.start, visiblePortion.end);

    // デバッグ情報（条件付き）
    if (DEBUG_TYPING_DISPLAY) {
      console.log('SimpleTypingDisplay - 表示テキスト決定:', {
        表示モード: showFullText ? 'フルテキスト' : '部分テキスト',
        有効範囲: hasValidRange,
        表示範囲:
          !showFullText && hasValidRange
            ? `${visiblePortion.start}-${visiblePortion.end}`
            : 'フル',
        実際の表示テキスト:
          effectiveRomaji?.substring(0, 20) +
          (effectiveRomaji?.length > 20 ? '...' : ''),
      });
    }

    // 表示範囲内での相対的な入力位置を計算
    const relativeTypedLength = Math.max(
      0,
      typedLength - (showFullText ? 0 : visiblePortion?.start || 0)
    );

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
        displayRemaining = safeRomaji.substring(remainingStartPos) || '';
      } else {
        // 表示範囲内のみの残り部分を計算
        const relativeRemainStart = Math.max(
          0,
          remainingStartPos - (visiblePortion?.start || 0)
        );
        displayRemaining = effectiveRomaji.substring(relativeRemainStart) || '';
      }
    } else {
      // 通常モードでの表示処理
      displayNextChar = nextChar;

      if (showFullText) {
        const remainingStartPos = typedLength + (nextChar ? 1 : 0);
        displayRemaining = safeRomaji.substring(remainingStartPos) || '';
      } else {
        // 表示範囲内のみの残り部分を計算
        const relativeNextCharPos = relativeTypedLength + (nextChar ? 1 : 0);
        displayRemaining = effectiveRomaji.substring(relativeNextCharPos) || '';
      }
    }

    // 最適化：スクロール処理を効率的に行うための関数を分離
    const updateScrollPosition = useCallback(() => {
      // フォーカス文字の要素と親コンテナが両方存在し、かつtypedLengthが変更された場合のみスクロール処理を実行
      if (
        nextCharRef.current &&
        containerRef.current &&
        lastTypedLengthRef.current !== typedLength
      ) {
        try {
          // フォーカス文字の位置にスクロール
          const nextCharElem = nextCharRef.current;
          const container = containerRef.current;

          // 位置計算はパフォーマンスに影響するため、必要な時のみ実行
          // Performance API でパフォーマンスを測定（開発モードのみ）
          const startMeasure = DEBUG_TYPING_DISPLAY ? performance.now() : 0;

          // 軽量なDOM測定を使用
          const isVisible = () => {
            // この方法でのビジビリティ計算は比較的軽量
            const containerTop = container.scrollTop;
            const containerBottom = containerTop + container.clientHeight;
            const elemTop = nextCharElem.offsetTop;
            const elemBottom = elemTop + nextCharElem.offsetHeight;

            return elemTop >= containerTop && elemBottom <= containerBottom;
          };

          // 要素が見えていない場合のみスクロール調整
          if (!isVisible()) {
            // スクロール位置を計算
            // フォーカス文字を中央に配置
            const targetScrollTop =
              nextCharElem.offsetTop -
              container.clientHeight / 2 +
              nextCharElem.offsetHeight / 2;

            // スクロール位置を記憶
            lastScrollPositionRef.current = targetScrollTop;

            // スムーズスクロール
            container.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth',
            });
          }

          if (DEBUG_TYPING_DISPLAY) {
            const endMeasure = performance.now();
            console.log(
              `スクロール処理実行時間: ${endMeasure - startMeasure}ms`
            );
          }
        } catch (error) {
          console.error('フォーカス文字のスクロール処理エラー:', error);
        }

        // typedLengthを更新
        lastTypedLengthRef.current = typedLength;
      }
    }, [typedLength]);

    // フォーカス文字の可視化を保証するためのスクロール処理
    // 依存配列を大幅に削減し、必要最小限の変数のみに
    useEffect(() => {
      // requestAnimationFrameを使用してレンダリングサイクルと同期
      const animationFrame = requestAnimationFrame(() => {
        updateScrollPosition();
      });

      return () => {
        cancelAnimationFrame(animationFrame);
      };
    }, [typedLength, updateScrollPosition]);

    // マウント時、または表示範囲が変更されたときもスクロール位置を更新
    useEffect(() => {
      if (containerRef.current && contentRef.current) {
        if (typedLength > 0) {
          // テキストの入力位置に応じてコンテンツの位置を自動調整
          containerRef.current.scrollLeft = 0;
        }
      }
    }, [visiblePortion]);

    // 外部クラスと内部クラスを結合
    const containerClass = `${styles.typingText} ${className || ''} ${
      isError ? styles.errorShake : ''
    }`;

    // romaji全体が空の場合は空白表示
    if (!safeRomaji) {
      return (
        <div className={containerClass} ref={containerRef}>
          <span className={styles.typingCursor}></span>
        </div>
      );
    }

    // 部分表示の場合に前後に表示する省略記号
    const prefixEllipsis =
      !showFullText && hasValidRange && visiblePortion.start > 0 ? '...' : '';
    const suffixEllipsis =
      !showFullText && hasValidRange && visiblePortion.end < safeRomaji.length
        ? '...'
        : '';

    // デバッグ情報（本番では無効化）
    if (DEBUG_TYPING_DISPLAY) {
      console.log('SimpleTypingDisplay - レンダリング内容検証:', {
        romaji:
          safeRomaji.substring(0, 20) + (safeRomaji.length > 20 ? '...' : ''),
        typedLength,
        nextChar: displayNextChar,
        currentInput: displayCurrentInput,
        currentCharRomaji,
        showingFullText: showFullText,
        timestamp: new Date().toLocaleTimeString(),
      });
    }

    return (
      <div className={containerClass} ref={containerRef}>
        <div className={styles.typingTextContent} ref={contentRef}>
          {/* 前の部分が省略されている場合の省略記号 */}
          {prefixEllipsis && (
            <span className={styles.ellipsis}>{prefixEllipsis}</span>
          )}
          {/* 入力済み部分（セーフティチェック付き） */}
          {typed && (
            <span className={styles.typed}>
              {showFullText
                ? typed
                : effectiveRomaji.substring(
                    0,
                    Math.min(relativeTypedLength, effectiveRomaji.length)
                  )}
            </span>
          )}
          {/* 子音入力中の場合は、子音も表示（セーフティチェック付き） */}
          {inputMode === 'consonant' && displayCurrentInput && (
            <span className={styles.consonant}>{displayCurrentInput}</span>
          )}
          {/* 次に入力すべき文字（ハイライト表示）（セーフティチェック付き） */}
          {displayNextChar && (
            <span
              className={`${styles.nextChar} ${styles.optimizedFocus}`}
              ref={nextCharRef}
            >
              {displayNextChar}
            </span>
          )}{' '}
          {/* 子音入力中の場合は、現在の仮名の残りを表示（セーフティチェック強化） */}
          {inputMode === 'consonant' &&
            typeof currentCharRomaji === 'string' &&
            currentCharRomaji.length > (currentInput?.length || 0) + 1 && (
              <span className={styles.currentCharRemaining}>
                {currentCharRomaji.substring((currentInput?.length || 0) + 1)}
              </span>
            )}
          {/* 残りの未入力部分（セーフティチェック強化） */}
          {displayRemaining && (
            <span className={styles.remaining}>{displayRemaining}</span>
          )}
          {/* 後の部分が省略されている場合の省略記号 */}
          {suffixEllipsis && (
            <span className={styles.ellipsis}>{suffixEllipsis}</span>
          )}
          {/* タイピングカーソル */}
          <span className={styles.typingCursor}></span>
        </div>
      </div>
    );
  }
);

// コンポーネント名を設定（デバッグ用）
SimpleTypingDisplay.displayName = 'SimpleTypingDisplay';

export default SimpleTypingDisplay;
