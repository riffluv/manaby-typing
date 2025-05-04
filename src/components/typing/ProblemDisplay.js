import React, { memo } from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/GameScreen.module.css';
import { Animation } from '../../utils/DesignTokens';

/**
 * 改良版問題表示コンポーネント
 * タイピングゲームのお題（問題文）を表示する
 * 改行に対応し、ローマ字との間隔を最適化
 *
 * @param {Object} props
 * @param {string} props.text - 表示する問題テキスト
 * @param {boolean} props.animate - アニメーション効果を適用するかどうか
 */
const ProblemDisplay = ({ text = '', animate = true }) => {
  // パフォーマンス向上のためコンソール出力を開発環境のみに制限
  if (process.env.NODE_ENV === 'development') {
    console.debug('[ProblemDisplay] レンダリング:', {
      textLength: text?.length,
    });
  }

  // 改行があれば適切に処理するための関数
  const renderTextWithLineBreaks = (content) => {
    if (!content) return null;

    // テキストを改行で分割
    const lines = content.split('\n');

    return (
      <>
        {lines.map((line, index) => (
          <React.Fragment key={index}>
            <span>{line}</span>
            {index < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </>
    );
  };

  // アニメーションなしの場合
  if (!animate) {
    return (
      <p
        className={`typing-problem ${styles.typingProblem}`}
        data-testid="problem-display"
      >
        {renderTextWithLineBreaks(text)}
      </p>
    );
  }

  // アニメーション効果付きの表示
  return (
    <motion.p
      className={`typing-problem ${styles.typingProblem}`}
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        delay: 0.2,
        duration: parseFloat(Animation.duration.slow),
        type: 'spring',
        stiffness: 120,
        damping: 10,
      }}
      data-testid="problem-display"
    >
      {renderTextWithLineBreaks(text)}
    </motion.p>
  );
};

// シンプルな比較関数: テキストと animate プロパティが変わったときのみ再レンダリング
const arePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.text === nextProps.text && prevProps.animate === nextProps.animate
  );
};

// React.memo でコンポーネントをラップし、カスタム比較関数を使用
export default memo(ProblemDisplay, arePropsEqual);
