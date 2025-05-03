import React, { memo } from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/GameScreen.module.css';
import { Animation } from '../../utils/DesignTokens';

/**
 * 問題表示コンポーネント
 * タイピングゲームのお題（問題文）を表示する
 * グローバルスタイルを使用したデザインシステム
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

  // アニメーションなしの場合
  if (!animate) {
    return <p className={`typing-problem ${styles.typingProblem}`}>{text}</p>;
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
        type: 'spring' 
      }}
      data-testid="problem-display"
    >
      {text}
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
