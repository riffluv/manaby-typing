import React, { memo } from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/GameScreen.module.css';
import { Animation } from '../../utils/DesignTokens';

// デバッグログフラグ - 一時的に有効化（問題解決後に戻すことを推奨）
const DEBUG_PROBLEM_DISPLAY = process.env.NODE_ENV === 'development' && true;

/**
 * 改良版問題表示コンポーネント
 * タイピングゲームのお題（問題文）を表示する
 * 改行に対応し、ローマ字との間隔を最適化
 *
 * @param {Object} props
 * @param {string} props.text - 表示する問題テキスト
 * @param {boolean} props.animate - アニメーション効果を適用するかどうか
 * @param {string} props.className - 追加で適用するCSSクラス名
 */
const ProblemDisplay = ({ text = '', animate = true, className = '' }) => {  // パフォーマンス向上のためコンソール出力をデバッグフラグ条件付きに
  if (DEBUG_PROBLEM_DISPLAY) {
    console.log('[ProblemDisplay] レンダリング:', {
      text: text,
      textLength: text?.length,
      timestamp: new Date().toLocaleTimeString()
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
  // クラス名を結合（修正: GameScreenから渡されるclassNameを優先的に使用）
  const combinedClassName = `typing-problem ${styles.typingProblem} ${className}`.trim();

  // アニメーションなしの通常表示（リクエストに基づいて変更）
  // animateプロパティは残しつつも、すべての場合で通常表示を使用
  return (
    <p
      className={combinedClassName}
      data-testid="problem-display"
    >
      {renderTextWithLineBreaks(text)}
    </p>
  );
};

// シンプルな比較関数: テキストと animate プロパティが変わったときのみ再レンダリング
const arePropsEqual = (prevProps, nextProps) => {
  // テキストが変わった場合は必ず再レンダリング（デバッグログも追加）
  if (prevProps.text !== nextProps.text) {
    console.log('[ProblemDisplay] テキストが変更されたため再レンダリング:', {
      prevText: prevProps.text?.substring(0, 10) + '...',
      newText: nextProps.text?.substring(0, 10) + '...'
    });
    return false;
  }
  
  return (
    // テキスト比較は上で行ったため、残りのプロパティのみチェック
    prevProps.animate === nextProps.animate &&
    prevProps.className === nextProps.className
  );
};

// React.memo でコンポーネントをラップし、カスタム比較関数を使用
export default memo(ProblemDisplay, arePropsEqual);
