import React, { useMemo, memo } from 'react';
import styles from '../../styles/GameScreen.module.css';

/**
 * シンプル化したタイピング表示コンポーネント
 * すべてのタイピングテキストを中央揃えで表示
 * グローバルCSSのクラスを使用して統一された表示を実現
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

    // 現在の入力を含むテキスト表示 - useMemoでレンダリング最適化
    const displayText = useMemo(() => {
      if (!cleanDisplayRomaji) return null;

      // 全体が完了した場合
      if (isCompleted) {
        return <span className="typing-completed">{cleanDisplayRomaji}</span>;
      }

      const typedLength = coloringInfo?.typedLength || 0;
      const currentInputLength = coloringInfo?.currentInputLength || 0;
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
          {typedText && <span className="typing-completed">{typedText}</span>}

          {/* 現在の入力中部分 - 確定済みと同じ緑色で表示 */}
          {currentInput && (
            <span className="typing-current">{currentInput}</span>
          )}

          {/* 次に入力すべき文字を特別に強調（タイピングマニア風） */}
          {nextChar && (
            <span className={styles.nextCharHighlight}>{nextChar}</span>
          )}

          {/* 残りの未入力部分 */}
          {restText && <span style={{ color: '#757575' }}>{restText}</span>}
        </>
      );
    }, [
      cleanDisplayRomaji,
      coloringInfo,
      currentInput,
      isCompleted,
    ]);

    return (
      <div
        className={`typing-text ${styles.simpleTypingText} ${
          errorAnimation ? styles.errorShake : ''
        }`}
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
