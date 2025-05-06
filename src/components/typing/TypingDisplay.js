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
      
      // 修正：文字位置の計算を修正
      // 正確に位置計算し、文字を分割する
      const typedText = cleanDisplayRomaji.substring(0, typedLength);
      const nextChars = cleanDisplayRomaji.substring(typedLength, typedLength + 1);
      const remainingText = cleanDisplayRomaji.substring(typedLength + 1);

      // 現在の入力状態をcurrentInputから直接取得
      // 入力中の文字はハイライト表示

      return (
        <>
          {/* 入力済み部分 */}
          {typedText && <span className="typing-completed">{typedText}</span>}

          {/* 現在入力中の文字 - 強調表示 */}
          {currentInput && (
            <span 
              style={{
                color: '#32CD32', /* 薄い緑色 */
                fontWeight: '600',
              }}
            >
              {currentInput}
            </span>
          )}

          {/* 次に入力すべき文字を特別に強調（オレンジ色で表示） */}
          {nextChars && (
            <span
              style={{
                position: 'relative',
                color: '#ff9a28' /* オレンジに変更 */,
                textShadow: '0 0 6px rgba(255, 154, 40, 0.6)',
                fontWeight: '700',
                fontSize: '1.25rem',
                display: 'inline-block',
                padding: '0 1px',
                margin: '0 1px',
                transform: 'translateY(-1px)',
                backgroundColor: 'rgba(255, 154, 40, 0.1)',
                borderRadius: '2px',
              }}
            >
              {nextChars}
            </span>
          )}

          {/* 残りの未入力部分 */}
          {remainingText && <span style={{ color: '#757575' }}>{remainingText}</span>}
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
