import React, { memo } from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/GameScreen.module.css';
import { Animation } from '../../utils/DesignTokens';

// デバッグログフラグ - デフォルトで無効化（必要時のみ有効化）
const DEBUG_PROBLEM_DISPLAY = process.env.NODE_ENV === 'development' && false;

/**
 * 改良版問題表示コンポーネント（リファクタリング・安定化版 2025年5月12日）
 * タイピングゲームのお題（問題文）を表示する
 * 改行に対応し、ローマ字との間隔を最適化
 * セーフティチェック強化により安定性向上
 *
 * @param {Object} props
 * @param {string} props.text - 表示する問題テキスト
 * @param {boolean} props.animate - アニメーション効果を適用するかどうか
 * @param {string} props.className - 追加で適用するCSSクラス名
 */
const ProblemDisplay = ({ text = '', animate = true, className = '' }) => {
  // 入力データの有効性チェック
  const isValidText = typeof text === 'string';
  const safeText = isValidText ? text : '';

  // パフォーマンス向上のためコンソール出力をデバッグフラグ条件付きに
  if (DEBUG_PROBLEM_DISPLAY) {
    console.log('[ProblemDisplay] レンダリング:', {
      text: safeText,
      textLength: safeText.length,
      isValid: isValidText,
      timestamp: new Date().toLocaleTimeString()
    });
  }

  // 無効なテキストの場合は警告（開発環境のみ）
  if (process.env.NODE_ENV === 'development' && !isValidText) {
    console.warn('[ProblemDisplay] 無効なテキストが渡されました:', text);
  }
  // 改行があれば適切に処理するための関数（安全性強化版）
  const renderTextWithLineBreaks = (content) => {
    if (!content) return null;

    try {
      // テキストを改行で分割
      const lines = content.split('\n');

      // 行ごとに処理し、必要に応じて改行を挿入
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
    } catch (error) {
      // エラー発生時のフォールバック
      console.error('[ProblemDisplay] テキスト処理エラー:', error);
      return <span>{String(content || '')}</span>;
    }
  };

  // クラス名を結合（修正: GameScreenから渡されるclassNameを優先的に使用）
  const combinedClassName = `typing-problem ${styles.typingProblem} ${className || ''}`.trim();

  // アニメーションなしの通常表示
  // animateプロパティは残しつつも、すべての場合で安全に表示
  return (
    <p
      className={combinedClassName}
      data-testid="problem-display"
    >
      {renderTextWithLineBreaks(safeText)}
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
