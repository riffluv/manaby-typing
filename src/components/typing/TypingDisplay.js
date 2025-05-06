import React, { useMemo, memo } from 'react';
import styles from '../../styles/GameScreen.module.css';

/**
 * 【非推奨】複雑なタイピング表示コンポーネント
 * 
 * 注意: このコンポーネントは非推奨となりました。
 * 代わりに SimpleTypingDisplay.js を使用してください。
 * このファイルは参照目的のみで残されています。
 * 
 * @deprecated SimpleTypingDisplay.jsに置き換えられました
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

      // 拡張された色分け情報を活用
      const typedLength = coloringInfo?.typedLength || 0;
      const currentCharIndex = coloringInfo?.currentCharIndex !== undefined 
        ? coloringInfo?.currentCharIndex : 0;
      const expectedNextChar = coloringInfo?.expectedNextChar || '';
      const currentInput = coloringInfo?.currentInput || '';
      const currentCharRomaji = coloringInfo?.currentCharRomaji || '';
      
      // 正確に位置計算し、文字を分割する
      const typedText = cleanDisplayRomaji.substring(0, typedLength);
      
      // 現在の文字の完全なローマ字表現を取得
      // 例: 「す」= "su" なら、"su"全体がcurrentCharPlaceholder
      const currentCharPlaceholder = currentCharRomaji;

      // 未入力部分は、現在の文字の後から始まる
      const remainingStartPos = typedLength + currentCharPlaceholder.length;
      const remainingText = cleanDisplayRomaji.substring(remainingStartPos);

      return (
        <>
          {/* 入力済み部分 */}
          {typedText && <span className={styles.typing_completed}>{typedText}</span>}

          {/* 現在の文字の入力状況を表示 */}
          <span className={styles.current_char_container}>
            {/* 既に入力した部分 - 1文字ずつ分割して表示（リアルタイム対応） */}
            {currentInput && (
              <>
                {Array.from(currentInput).map((char, index) => (
                  <span key={index} className={styles.current_char_typed}>
                    {char}
                  </span>
                ))}
              </>
            )}
            
            {/* 次に入力すべき文字（次のキー）- オレンジ色でハイライト */}
            {expectedNextChar && (
              <span className={styles.next_char_highlight}>
                {expectedNextChar}
              </span>
            )}

            {/* 現在の単語の残りの部分（まだタイプしていない）- 修正：可視性向上 */}
            {currentCharPlaceholder.substring(currentInput.length + 1) && (
              <span className={styles.current_char_remaining}>
                {currentCharPlaceholder.substring(currentInput.length + 1)}
              </span>
            )}
          </span>

          {/* 残りの未入力部分 - 修正：明確な色指定 */}
          {remainingText && <span className={styles.remaining_text}>{remainingText}</span>}
        </>
      );
    }, [
      cleanDisplayRomaji,
      coloringInfo,
      isCompleted,
    ]);

    return (
      <div
        className={`typing-text ${styles.simpleTypingText} ${errorAnimation ? styles.errorShake : ''
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
