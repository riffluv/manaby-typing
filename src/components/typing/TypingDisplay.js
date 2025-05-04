import React, { useMemo, memo } from 'react';
import styles from '../../styles/GameScreen.module.css';

/**
 * 改良版タイピング表示コンポーネント
 * 可読性と改行対応を強化
 * 等幅フォントと適切なスペーシングで視認性を向上
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

    // 改行を含むテキストを適切に処理
    const displayText = useMemo(() => {
      if (!cleanDisplayRomaji) return null;

      // 全体が完了した場合
      if (isCompleted) {
        // 改行を適切に処理するためにテキストを分割
        const lines = cleanDisplayRomaji.split('\n');
        return (
          <>
            {lines.map((line, index) => (
              <React.Fragment key={index}>
                <span className="typing-completed">{line}</span>
                {index < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </>
        );
      }

      const typedLength = coloringInfo?.typedLength || 0;
      const currentInputLength = coloringInfo?.currentInputLength || 0;
      const currentPosition = coloringInfo?.currentPosition || 0;

      // タイプしたテキストと残りのテキストに分割
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

      // 改行を含む場合に適切に処理するヘルパー関数
      const renderWithLineBreaks = (text, className) => {
        if (!text) return null;
        const lines = text.split('\n');
        return (
          <>
            {lines.map((line, index) => (
              <React.Fragment key={`${className}-${index}`}>
                <span className={className}>{line}</span>
                {index < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </>
        );
      };

      return (
        <>
          {/* 入力済み部分 - 改行対応 */}
          {typedText && renderWithLineBreaks(typedText, "typing-completed")}

          {/* 現在の入力中部分 - 確定済みと同じ緑色で表示 */}
          {currentInput && (
            <span className="typing-completed">{currentInput}</span>
          )}

          {/* 次に入力すべき文字を特別に強調 */}
          {nextChar && (
            <span className={styles.nextCharHighlight}>
              {nextChar === '\n' ? '↵' : nextChar}
            </span>
          )}

          {/* 残りの未入力部分 - 改行対応 */}
          {restText && renderWithLineBreaks(restText, styles.remainingText)}
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
        aria-live="polite"
        aria-label={`タイピング領域: ${isCompleted ? '完了' : '入力中'}`}
      >
        {displayText}

        {/* タイピングマニア風のカーソルフィードバック */}
        {!isCompleted && <span className={styles.typingCursor} aria-hidden="true"></span>}
      </div>
    );
  }
);

// 表示名を設定（デバッグ用）
TypingDisplay.displayName = 'TypingDisplay';

export default TypingDisplay;
