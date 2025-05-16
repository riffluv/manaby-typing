'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import ProblemDisplay from './ProblemDisplay';
import SimpleTypingDisplay from './SimpleTypingDisplay';
import CanvasKeyboard from './CanvasKeyboard';
import { useSimpleTypingAdapter } from '../../hooks/useSimpleTypingAdapter';
import styles from '../../styles/typing/TypingArea.module.css';

/**
 * タイピングエリアコンポーネント
 * GameScreenから分離した表示用コンポーネント
 */
const TypingArea = ({
  typing,
  currentProblem,
  lastPressedKey = '',
  className = '',
}) => {
  // シンプル表示用のプロパティを取得
  const simpleProps = useSimpleTypingAdapter(typing);

  // 次に入力すべきキーを取得
  const nextKey = useMemo(() => {
    return typing?.typingSession?.getCurrentExpectedKey?.() || '';
  }, [typing]);

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
    return (
      <div className={`${styles.typing_area} ${className}`}>
        <div className={styles.typing_loading}>読み込み中...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.typing_area} ${className}`}>
      {/* お題エリア */}
      <motion.div
        className={styles.problem_container}
        initial={animationVariants.problemArea.initial}
        animate={animationVariants.problemArea.animate}
        transition={animationVariants.problemArea.transition}
      >
        {/* 問題表示コンポーネント */}
        <ProblemDisplay
          text={currentProblem?.displayText || ''}
          className={styles.problem_text}
        />

        {/* 入力エリア */}
        <SimpleTypingDisplay
          romaji={simpleProps.romaji}
          typedLength={simpleProps.typedLength}
          nextChar={simpleProps.nextChar}
          isError={simpleProps.isError}
          className={styles.input_area}
          inputMode={simpleProps.inputMode}
          currentInput={simpleProps.currentInput}
          currentCharRomaji={simpleProps.currentCharRomaji}
        />
      </motion.div>

      {/* キーボード表示 */}
      <motion.div
        className={styles.keyboard_container}
        initial={animationVariants.keyboard.initial}
        animate={animationVariants.keyboard.animate}
        transition={animationVariants.keyboard.transition}
      >
        <CanvasKeyboard
          nextKey={nextKey}
          lastPressedKey={lastPressedKey}
          isError={typing.errorAnimation}
          layout="jp"
        />
      </motion.div>
    </div>
  );
};

export default TypingArea;
