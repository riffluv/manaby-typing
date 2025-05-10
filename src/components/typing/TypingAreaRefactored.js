'use client';

/**
 * TypingAreaRefactored.js
 * リファクタリング版タイピングエリアコンポーネント
 * 責任: タイピング入力表示とキーボード表示
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import ProblemDisplay from './ProblemDisplay';
import SimpleTypingDisplay from './SimpleTypingDisplay';
import CanvasKeyboard from './CanvasKeyboard';
import styles from '../../styles/typing/TypingArea.module.css';

/**
 * リファクタリング版タイピングエリアコンポーネント
 * 副作用を減らし、パフォーマンスを最適化
 */
const TypingAreaRefactored = ({
  typing,
  currentProblem,
  lastPressedKey = '',
  className = '',
}) => {
  // タイピング表示用の状態
  const [displayData, setDisplayData] = useState({
    romaji: '',
    typedLength: 0,
    currentCharIndex: 0,
  });  // 次に入力すべきキーを取得
  const nextKey = useMemo(() => {
    const key = typing?.getNextKey?.() || '';
    console.log('[TypingAreaRefactored] 次のキー:', key);
    return key;
  }, [typing, typing?.displayInfo?.currentCharIndex, typing?.displayInfo?.typedLength]);// 表示データの更新（キャラクターインデックスが変わったときに更新）
  useEffect(() => {
    if (typing?.displayInfo) {      // displayInfoの特定のプロパティを依存配列で監視し、値が変わった時だけ更新
      const { romaji, typedLength, currentCharIndex, currentInput, currentCharRomaji, expectedNextChar } = typing.displayInfo;

      // デバッグ出力
      console.log('[TypingAreaRefactored] 表示データ更新:', {
        romaji: romaji?.substring(0, 20) + (romaji?.length > 20 ? '...' : ''),
        typedLength,
        currentCharIndex,
        currentInput,
        expectedNextChar
      });

      setDisplayData({
        romaji: romaji || '',
        typedLength: typedLength || 0,
        currentCharIndex: currentCharIndex || 0,
        currentInput: currentInput || '',
        currentCharRomaji: currentCharRomaji || '',
        expectedNextChar: expectedNextChar || '',
      });
    }
  }, [
    typing?.displayInfo?.romaji,
    typing?.displayInfo?.typedLength,
    typing?.displayInfo?.currentCharIndex,
    typing?.displayInfo?.currentInput,
    typing?.displayInfo?.currentCharRomaji,
    typing?.displayInfo?.expectedNextChar
  ]);

  // アニメーション用のバリアント
  const animationVariants = useMemo(
    () => ({
      problemArea: {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.2, duration: 0.3 },
      },
      keyboard: {
        initial: { opacity: 0, y: 25 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.3, duration: 0.4 },
      },
    }),
    []
  );
  if (!typing) {
    console.log('[TypingAreaRefactored] typingオブジェクトがありません');
    return (
      <div className={`${styles.typing_area} ${className}`}>
        <div className={styles.typing_loading}>読み込み中...</div>
      </div>
    );
  }

  // currentProblemが存在するか検証
  if (!currentProblem) {
    console.log('[TypingAreaRefactored] 問題データがありません');
    return (
      <div className={`${styles.typing_area} ${className}`}>
        <div className={styles.typing_loading}>問題を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.typing_area} ${className}`}>
      {/* 問題表示エリア */}
      <motion.div
        variants={animationVariants.problemArea}
        initial="initial"
        animate="animate"
        className={styles.typing_area__problem}
        data-error={typing.errorAnimation ? 'true' : 'false'}
      >        <ProblemDisplay
          text={currentProblem?.displayText || '表示するお題がありません'}
          animate={true}
          className={typing.errorAnimation ? styles.typing_area__problem_error : ''}
        />        <SimpleTypingDisplay
          romaji={displayData.romaji}
          typedLength={displayData.typedLength}
          nextChar={displayData.expectedNextChar || nextKey}
          isError={typing.errorAnimation}
          className={styles.typing_area__romaji}
          currentInput={displayData.currentInput || typing?.displayInfo?.currentInput || ''}
          currentCharRomaji={displayData.currentCharRomaji || typing?.displayInfo?.currentCharRomaji || ''}
          inputMode={displayData.currentInput ? 'consonant' : 'normal'}
        />
      </motion.div>

      {/* キーボード表示 */}
      <motion.div
        variants={animationVariants.keyboard}
        initial="initial"
        animate="animate"
        className={styles.typing_area__keyboard}
      >        <CanvasKeyboard
          nextKey={nextKey}
          lastPressedKey={lastPressedKey}
          isError={typing.errorAnimation}
          className={styles.typing_area__keyboard_canvas}
        />
      </motion.div>
    </div>
  );
};

export default TypingAreaRefactored;
