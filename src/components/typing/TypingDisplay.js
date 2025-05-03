import React, { useMemo, memo } from 'react';
import styles from '../../styles/GameScreen.module.css';
import { TextStyles, TextAnimations } from '../../utils/TextStyleUtils';

/**
 * シンプル化したタイピング表示コンポーネント
 * すべてのタイピングテキストを中央揃えで表示
 * TextStyleUtils からスタイル定義を使用して統一された表示を実現
 */
const TypingDisplay = memo(
  ({
    displayRomaji,
    coloringInfo,
    isCompleted,
    currentInput,
    errorAnimation,
  }) => {
    // ローマ字文字列から末尾の「|」を削除（存在する場合）
    const cleanDisplayRomaji = useMemo(() => {
      return displayRomaji && displayRomaji.endsWith('|')
        ? displayRomaji.slice(0, -1)
        : displayRomaji;
    }, [displayRomaji]);

    // 文字色分け用のスタイルオブジェクト - useMemoでレンダリング最適化
    const textStyles = useMemo(() => {
      const { typedLength = 0, currentInputLength = 0 } = coloringInfo || {};

      // TextStyleUtilsから共通スタイルを取得
      return {
        typed: TextStyles.typed,
        current: TextStyles.current,
        notTyped: TextStyles.notTyped,
        nextChar: TextStyles.nextChar,
        typedLength,
        currentInputLength,
      };
    }, [coloringInfo]);

    // 現在の入力を含むテキスト表示 - useMemoでレンダリング最適化
    const displayText = useMemo(() => {
      if (!cleanDisplayRomaji) return null;

      // 全体が完了した場合
      if (isCompleted) {
        return <span style={textStyles.typed}>{cleanDisplayRomaji}</span>;
      }

      const { typedLength, currentInputLength } = textStyles;
      const currentPosition = coloringInfo?.currentPosition || 0;

      // テキストを複数のパーツに分割（タイピングマニアのアプローチ）
      const typedText = cleanDisplayRomaji.substring(0, typedLength);
      const currentText = cleanDisplayRomaji.substring(
        currentPosition,
        currentPosition + currentInputLength
      );
      const nextChar = cleanDisplayRomaji.charAt(
        currentPosition + currentInputLength
      );
      const restText = cleanDisplayRomaji.substring(
        currentPosition + currentInputLength + 1
      );

      return (
        <>
          {/* 入力済み部分 */}
          {typedText && <span style={textStyles.typed}>{typedText}</span>}

          {/* 現在の入力中部分 - 確定済みと同じ緑色で表示 */}
          {currentInput && (
            <span style={textStyles.current}>{currentInput}</span>
          )}

          {/* 次に入力すべき文字を特別に強調（タイピングマニア風） */}
          {nextChar && (
            <span
              style={textStyles.nextChar}
              className={styles.nextCharHighlight}
            >
              {nextChar}
            </span>
          )}

          {/* 残りの未入力部分 */}
          {restText && <span style={textStyles.notTyped}>{restText}</span>}
        </>
      );
    }, [
      cleanDisplayRomaji,
      coloringInfo,
      currentInput,
      isCompleted,
      textStyles,
    ]);

    return (
      <div
        className={`${styles.simpleTypingText} ${
          errorAnimation ? styles.errorShake : ''
        }`}
        style={TextStyles.typingText} // ベースのタイピングテキストスタイルを適用
      >
        {displayText}

        {/* タイピングマニア風のカーソルフィードバック */}
        {!isCompleted && <span className={styles.typingCursor}></span>}
      </div>
    );
  }
);

// 表示名を設定（デバッグ用）
TypingDisplay.displayName = 'TypingDisplay';

export default TypingDisplay;
